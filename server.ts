import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { timingSafeEqual, randomUUID, randomBytes, createHmac, scrypt } from 'crypto';
import { put } from '@vercel/blob';
import { GoogleGenAI } from '@google/genai';
import { Redis } from '@upstash/redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// DATABASE
// ==========================================

// Redis-backed record store (Upstash via Vercel Marketplace).
// Each collection is a hash (id -> JSON document) plus a sorted set that keeps
// newest-first order. Without KV_REST_API_* it falls back to in-memory arrays.

type Collection = 'orders' | 'bookings' | 'reviews' | 'parts' | 'cars' | 'reports' | 'users' | 'audit' | 'conversations' | 'sellerReviews' | 'memberships' | 'partRequests';

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const isDatabaseConnected = Boolean(redis);

const memory: Record<Collection, any[]> = { orders: [], bookings: [], reviews: [], parts: [], cars: [], reports: [], users: [], audit: [], conversations: [], sellerReviews: [], memberships: [], partRequests: [] };
let readyPromise: Promise<void> | null = null;

const dataKey = (c: Collection) => `kgzone:${c}`;
const orderKey = (c: Collection) => `kgzone:${c}:order`;

// Seeds each collection once (guarded by a SET NX flag so parallel cold starts don't double-seed).
function initStore(seed: Record<Collection, any[]>): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    if (!redis) {
      for (const c of Object.keys(seed) as Collection[]) memory[c] = [...seed[c]];
      return;
    }

    for (const c of Object.keys(seed) as Collection[]) {
      const claimed = await redis.set(`kgzone:${c}:seeded`, '1', { nx: true });
      if (!claimed || seed[c].length === 0) continue;
      // Seed arrays are newest-first; offset scores to keep that order.
      const now = Date.now();
      const p = redis.pipeline();
      seed[c].forEach((item, i) => {
        p.hset(dataKey(c), { [item.id]: item });
        p.zadd(orderKey(c), { score: now - i * 1000, member: item.id });
      });
      await p.exec();
    }
  })().catch((err) => {
    readyPromise = null;
    throw err;
  });

  return readyPromise;
}

async function listRecords<T = any>(c: Collection): Promise<T[]> {
  if (!redis) return memory[c];
  const ids = await redis.zrange<string[]>(orderKey(c), 0, -1, { rev: true });
  if (ids.length === 0) return [];
  const docs = await redis.hmget<Record<string, T>>(dataKey(c), ...ids);
  return ids.map((id) => docs?.[id]).filter(Boolean) as T[];
}

async function insertRecord<T extends { id: string }>(c: Collection, item: T): Promise<T> {
  if (!redis) {
    memory[c].unshift(item);
    return item;
  }
  await redis
    .pipeline()
    .hset(dataKey(c), { [item.id]: item })
    .zadd(orderKey(c), { score: Date.now(), member: item.id })
    .exec();
  return item;
}

async function updateRecord<T = any>(c: Collection, id: string, patch: Partial<T>): Promise<T | null> {
  if (!redis) {
    const item = memory[c].find((r) => r.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    return item;
  }
  const current = await redis.hget<T>(dataKey(c), id);
  if (!current) return null;
  const updated = { ...current, ...patch };
  await redis.hset(dataKey(c), { [id]: updated });
  return updated;
}

async function getRecord<T = any>(c: Collection, id: string): Promise<T | null> {
  if (!redis) return memory[c].find((r) => r.id === id) ?? null;
  return (await redis.hget<T>(dataKey(c), id)) ?? null;
}

async function deleteRecord(c: Collection, id: string): Promise<boolean> {
  if (!redis) {
    const i = memory[c].findIndex((r) => r.id === id);
    if (i < 0) return false;
    memory[c].splice(i, 1);
    return true;
  }
  const [removed] = await redis.pipeline().hdel(dataKey(c), id).zrem(orderKey(c), id).exec<[number, number]>();
  return removed > 0;
}

async function countRecords(c: Collection): Promise<number> {
  if (!redis) return memory[c].length;
  return redis.zcard(orderKey(c));
}

// Initialize Gemini client on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make sure the DB table exists and is seeded before any API call touches it
app.use('/api', (_req: Request, res: Response, next) => {
  initStore({ orders: seedOrders, bookings: seedBookings, reviews: seedReviews, parts: [], cars: [], reports: [], users: [], audit: [], conversations: [], sellerReviews: [], memberships: [], partRequests: [] })
    .then(() => next())
    .catch((err) => {
      console.error('[DB] init failed:', err);
      res.status(503).json({ success: false, error: 'База данных недоступна' });
    });
});

// Customer names and phones are only readable with the ADMIN_TOKEN env var
// (sent as "Authorization: Bearer <token>" or "x-admin-token"). Without it set, access is denied.
const isAdmin = (req: Request) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = req.get('x-admin-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const a = Buffer.from(header), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Admin password header, or a signed-in admin/moderator account (see the accounts section below)
const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (isAdmin(req)) { (req as any).actor = 'admin-token'; return next(); }
  getSessionUser(req)
    .then((user) => {
      if (user && (user.role === 'admin' || user.role === 'moderator')) {
        (req as any).actor = user;
        return next();
      }
      res.status(401).json({ success: false, error: 'Требуется доступ администратора' });
    })
    .catch(() => res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }));
};

// Express 4 does not catch rejected promises from async handlers
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => {
    handler(req, res).catch((err) => {
      console.error('[API] error:', err);
      res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    });
  };

// Telegram bot (TELEGRAM_BOT_TOKEN env var). Users link their Telegram in the cabinet; staff
// who linked it get admin notifications too (plus TELEGRAM_CHAT_ID when set).
// Every call does nothing without the token and never fails the request.
async function tgCall(method: string, body: Record<string, unknown>): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return await r.json();
  } catch (err) {
    console.warn(`[Telegram] ${method} failed:`, err);
    return null;
  }
}
const tgSend = (chatId: string, text: string) => tgCall('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true });

async function staffChatIds(): Promise<string[]> {
  const ids = new Set<string>();
  if (process.env.TELEGRAM_CHAT_ID) ids.add(process.env.TELEGRAM_CHAT_ID);
  for (const u of await listRecords<any>('users')) {
    if (u.telegramChatId && !u.blocked && (u.role === 'admin' || u.role === 'moderator')) ids.add(u.telegramChatId);
  }
  return [...ids];
}

async function notifyAdmin(text: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await Promise.all((await staffChatIds()).map((id) => tgSend(id, text)));
  } catch (err) {
    console.warn('[Telegram] notify failed:', err);
  }
}

// Personal notification to one user (seller, buyer) when they linked Telegram
async function notifyUser(userId: string | undefined, text: string) {
  if (!userId || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const u = await getRecord<any>('users', userId);
    if (u?.telegramChatId && !u.blocked) await tgSend(u.telegramChatId, text);
  } catch (err) {
    console.warn('[Telegram] user notify failed:', err);
  }
}
const SITE_URL = process.env.SITE_URL || 'https://k-gzone.vercel.app';

// In-memory data store with initial seed
interface OrderRecord {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  partId: string;
  partTitle: string;
  partNumber: string;
  storeName: string;
  storeLocation: string;
  priceKgs: number;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress: string;
  status: 'Новый' | 'В обработке' | 'Готов к выдаче' | 'Выполнен' | 'Отменен';
  comment?: string;
}

const seedOrders: OrderRecord[] = [
  {
    id: 'ord-101',
    orderNumber: 'KGZ-8821',
    createdAt: 'Сегодня, 11:20',
    customerName: 'Адилет Эркинов',
    customerPhone: '+996 700 123 456',
    partId: 'part-1',
    partTitle: 'Амортизатор передний правый KYB Excel-G',
    partNumber: '334399',
    storeName: 'Япония-Авто (Кудайберген)',
    storeLocation: 'Рынок Кудайберген, Проход 3, контейнер 42Б',
    priceKgs: 4500,
    deliveryType: 'delivery',
    deliveryAddress: 'г. Бишкек, мкр. Асанбай, дом 14, кв. 22',
    status: 'В обработке',
    comment: 'Заказ оформлен онлайн через сайт KGzone',
  },
  {
    id: 'ord-102',
    orderNumber: 'KGZ-7734',
    createdAt: 'Вчера, 16:45',
    customerName: 'Адилет Эркинов',
    customerPhone: '+996 700 123 456',
    partId: 'part-2',
    partTitle: 'Колодки тормозные передние керамика Brembo',
    partNumber: 'P 83 071',
    storeName: 'Brembo Center Bishkek',
    storeLocation: 'ул. Льва Толстого 19/1 (СТО Drive)',
    priceKgs: 2800,
    deliveryType: 'pickup',
    deliveryAddress: 'Самовывоз из магазина',
    status: 'Готов к выдаче',
    comment: 'Самовывоз сегодня после 18:00',
  },
];

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'KGzone Auto Portal API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected ? 'redis' : 'in-memory',
  });
});

// Orders API
const SEED_ORDER_IDS = new Set(seedOrders.map((o) => o.id));
app.get('/api/orders', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    orders: (await listRecords<OrderRecord>('orders')).filter((o) => !SEED_ORDER_IDS.has(o.id)),
  });
}));

app.post('/api/orders', asyncRoute(async (req: Request, res: Response) => {
  const buyer = await getSessionUser(req);
  const {
    customerName,
    customerPhone,
    partId,
    partTitle,
    partNumber,
    storeName,
    storeLocation,
    priceKgs,
    deliveryType,
    deliveryAddress,
    comment,
  } = req.body;

  if (!customerName || !customerPhone || !partTitle) {
    return res.status(400).json({
      success: false,
      error: 'Укажите ФИО, телефон и запчасть',
    });
  }

  const newOrder: OrderRecord = {
    id: `ord-${Date.now()}`,
    orderNumber: `KGZ-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    customerName,
    customerPhone,
    partId: partId || 'part-custom',
    partTitle,
    partNumber: partNumber || '—',
    storeName: storeName || 'Авторынок Кудайберген',
    storeLocation: storeLocation || 'г. Бишкек',
    priceKgs: Number(priceKgs) || 0,
    deliveryType: deliveryType || 'delivery',
    deliveryAddress: deliveryAddress || 'Самовывоз',
    status: 'Новый',
    comment: comment || '',
    ...(buyer ? { userId: buyer.id } : {}),
  };

  await insertRecord('orders', newOrder);
  await notifyAdmin(
    `🛒 Новый заказ запчасти ${newOrder.orderNumber}\n${newOrder.partTitle}\n${newOrder.priceKgs} сом · ${newOrder.storeName}\n` +
      `Клиент: ${newOrder.customerName}, ${newOrder.customerPhone}\n` +
      (newOrder.deliveryType === 'delivery' ? `Доставка: ${newOrder.deliveryAddress}` : 'Самовывоз')
  );

  res.status(201).json({
    success: true,
    order: newOrder,
  });
}));

// Update order status
app.patch('/api/orders/:id/status', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await updateRecord<OrderRecord>('orders', id, { status });
  if (!order) {
    return res.status(404).json({ success: false, error: 'Заказ не найден' });
  }

  res.json({
    success: true,
    order,
  });
}));

// There is no access to government registries (arrests, liens, fines), so the site never
// invents a check result. The CarCheck window explains how to check a car officially.
app.get('/api/carcheck/:plate', (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Проверка по базам госорганов на сайте не подключена. Проверьте авто официально в ГУ «Унаа» / ЦОН.' });
});

// Customs calculator calculation endpoint
app.post('/api/customs-calc', (req: Request, res: Response) => {
  const { year, engineVolumeCc, fuelType, priceUsd } = req.body;
  const currentYear = 2026;
  const age = Math.max(0, currentYear - (Number(year) || currentYear));
  const engine = Number(engineVolumeCc) || 2000;
  const price = Number(priceUsd) || 10000;

  // Green / Electric car preference
  if (fuelType === 'Электро') {
    return res.json({
      success: true,
      customsDutyUsd: 0,
      customsDutyKgs: 0,
      vatUsd: 0,
      recyclingFeeUsd: 150,
      clearanceFeeUsd: 50,
      totalCostUsd: 200,
      totalCostKgs: 200 * 87.5,
      note: 'Для электромобилей в Кыргызстане действует нулевая ставка пошлины и НДС (0%)!',
    });
  }

  // Tariff calculation for combustion / hybrid
  let ratePerCc = 0.5;
  if (age <= 3) ratePerCc = 0.6;
  else if (age <= 7) ratePerCc = 0.9;
  else if (age <= 12) ratePerCc = 1.4;
  else ratePerCc = 2.2;

  const customsDutyUsd = Math.round(engine * ratePerCc);
  const vatUsd = Math.round((price + customsDutyUsd) * 0.12);
  const recyclingFeeUsd = age > 10 ? 300 : 180;
  const clearanceFeeUsd = 60;
  const totalCostUsd = customsDutyUsd + vatUsd + recyclingFeeUsd + clearanceFeeUsd;
  const usdToKgs = 87.5;

  res.json({
    success: true,
    customsDutyUsd,
    customsDutyKgs: Math.round(customsDutyUsd * usdToKgs),
    vatUsd,
    vatKgs: Math.round(vatUsd * usdToKgs),
    recyclingFeeUsd,
    clearanceFeeUsd,
    totalCostUsd,
    totalCostKgs: Math.round(totalCostUsd * usdToKgs),
    note: `Расчет по сетке ЕАЭС и Государственной таможенной службы КР на ${currentYear} год`,
  });
});

// Workshop Bookings in-memory store
const seedBookings: any[] = [
  {
    id: 'bk-9401',
    bookingNumber: 'BK-9401',
    serviceTitle: 'Компьютерная диагностика всех систем + сканер',
    masterName: 'Уланбек Исаев',
    date: 'Завтра',
    timeSlot: '11:00',
    carBrandModel: 'Toyota Camry 70',
    clientName: 'Амантур Беков',
    clientPhone: '+996 555 123 456',
    paymentMethod: 'mbank',
    status: 'Подтверждено',
    totalPriceKgs: 800,
    workshopLocation: 'Центральный СТО KGzone (ул. Льва Толстого, 19/1)',
    createdAt: 'Сегодня, 16:42',
    telegramNotified: true,
  },
  {
    id: 'bk-9402',
    bookingNumber: 'BK-9402',
    serviceTitle: '3D Развал-схождение (обе оси)',
    masterName: 'Азамат Токтогулов',
    date: 'Послезавтра',
    timeSlot: '14:30',
    carBrandModel: 'Lexus RX 350',
    clientName: 'Бекзат Омурбеков',
    clientPhone: '+996 700 987 654',
    paymentMethod: 'elkart',
    status: 'Ожидает подтверждения',
    totalPriceKgs: 1200,
    workshopLocation: 'Филиал авторынка «Кудайберген»',
    createdAt: 'Сегодня, 15:20',
    telegramNotified: true,
  },
];

app.get('/api/workshop/bookings', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  const seedIds = new Set(seedBookings.map((b: any) => b.id));
  res.json({ success: true, bookings: (await listRecords('bookings')).filter((b: any) => !seedIds.has(b.id)) });
}));

app.post('/api/workshop/bookings', asyncRoute(async (req: Request, res: Response) => {
  const {
    serviceTitle,
    masterName,
    date,
    timeSlot,
    carBrandModel,
    clientName,
    clientPhone,
    paymentMethod,
    workshopLocation,
    totalPriceKgs,
  } = req.body;

  if (!clientName || !clientPhone || !carBrandModel) {
    return res.status(400).json({ success: false, error: 'Заполните имя, телефон и модель авто' });
  }

  const newBooking = {
    id: `bk-${Date.now()}`,
    bookingNumber: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
    serviceTitle: serviceTitle || 'Комплексный осмотр',
    masterName: masterName || 'Дежурный мастер',
    date: date || 'Сегодня',
    timeSlot: timeSlot || '10:00',
    carBrandModel,
    clientName,
    clientPhone,
    paymentMethod: paymentMethod || 'mbank',
    status: 'Подтверждено',
    totalPriceKgs: Number(totalPriceKgs) || 800,
    workshopLocation: workshopLocation || 'Центральный СТО KGzone (ул. Льва Толстого 19/1)',
    createdAt: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    telegramNotified: true,
  };

  await insertRecord('bookings', newBooking);
  await notifyAdmin(
    `🔧 Новая запись на СТО ${newBooking.bookingNumber}\n${newBooking.serviceTitle}\n` +
      `${newBooking.date} ${newBooking.timeSlot} · мастер ${newBooking.masterName}\n` +
      `Клиент: ${newBooking.clientName}, ${newBooking.clientPhone}\nАвто: ${newBooking.carBrandModel}`
  );

  res.status(201).json({ success: true, booking: newBooking });
}));



// User Reviews API
const seedReviews: any[] = [
  {
    id: 'rev-1',
    authorName: 'Бектур Асаналиев',
    city: 'Бишкек',
    category: 'service',
    targetTitle: 'СТО KGzone (Льва Толстого 19/1)',
    rating: 5,
    date: 'Сегодня, 14:20',
    text: 'Делал замену цепи ГРМ и компьютерную диагностику на Camry 70. Мастер Уланбек профессионал своего дела! Все сняли на видео, показали износ старой цепи, работу закончили точно в обещанный срок. Рекомендую!',
    pros: 'Пунктуальность, видеоотчет деталей, чистый бокс',
    cons: 'Нужно записываться заранее, на выходные плотная очередь',
    verifiedPurchase: true,
    likes: 15,
  },
  {
    id: 'rev-2',
    authorName: 'Айбек Жолдошев',
    city: 'Ош',
    category: 'parts',
    targetTitle: 'Заказ тормозных колодок Brembo',
    rating: 5,
    date: 'Вчера, 11:30',
    text: 'Заказал через портал запчастей с Кудайбергена. Доставили на Западный автовокзал попутным спринтером за 1 день. Проверил по QR-коду — 100% оригинал.',
    pros: 'Быстрая отправка в регионы, честная цена без накруток',
    verifiedPurchase: true,
    likes: 9,
  },
  {
    id: 'rev-3',
    authorName: 'Канат Сулайманов',
    city: 'Каракол',
    category: 'carcheck',
    targetTitle: 'Отчет проверки CarCheck KG',
    rating: 5,
    date: '3 дня назад',
    text: 'Спасся от покупки арестованной машины! Продавец уверял, что один хозяин и нет штрафов. В отчете вылез залог в банке на 400 000 сомов. Спасибо системе за сохраненные деньги!',
    pros: 'Мгновенный отчет, база ГУОБДД и нотариата',
    verifiedPurchase: true,
    likes: 31,
  },
];

const SEED_REVIEW_IDS = new Set(seedReviews.map((r) => r.id));
const isRealReview = (r: any) => !SEED_REVIEW_IDS.has(r.id);

app.get('/api/reviews', asyncRoute(async (_req: Request, res: Response) => {
  const reviews = (await listRecords('reviews')).filter((r: any) => isRealReview(r) && r.status === 'approved');
  res.json({ success: true, reviews });
}));

app.get('/api/admin/reviews', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, reviews: (await listRecords('reviews')).filter(isRealReview) });
}));

app.patch('/api/admin/reviews/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const status = ['approved', 'rejected'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ success: false, error: 'Неверный статус' });
  const updated = await updateRecord('reviews', req.params.id, { status });
  if (!updated) return res.status(404).json({ success: false, error: 'Отзыв не найден' });
  res.json({ success: true });
}));

app.post('/api/reviews', asyncRoute(async (req: Request, res: Response) => {
  if (tooMany(`review:${clientIp(req)}`, 5, 60 * 60_000)) {
    return res.status(429).json({ success: false, error: 'Слишком много отзывов. Попробуйте позже.' });
  }
  const b = req.body || {};
  const authorName = str(b.authorName, 80), text = str(b.text, 3000);
  const city = str(b.city, 60), category = str(b.category, 40), targetTitle = str(b.targetTitle, 160);
  const rating = b.rating, pros = str(b.pros, 1000), cons = str(b.cons, 1000);
  if (!authorName || !text) {
    return res.status(400).json({ success: false, error: 'Заполните имя и отзыв' });
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    authorName,
    city: city || 'Бишкек',
    category: category || 'service',
    targetTitle: targetTitle || '',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    date: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    text,
    pros: pros || '',
    cons: cons || '',
    // A purchase can't be verified, so reviews are never marked as such
    verifiedPurchase: false,
    likes: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await insertRecord('reviews', newReview);
  await notifyAdmin(`💬 Новый отзыв на модерации\n${authorName}: ${text.slice(0, 300)}`);
  res.status(201).json({ success: true, review: newReview, pending: true });
}));

// ==========================================
// AUTO PARTS CATALOG WITH MODERATION
// Sellers submit parts -> status 'pending'; an admin approves or rejects them.
// Only approved parts are public. Parts added by an admin are approved right away.
// ==========================================

type PartStatus = 'pending' | 'approved' | 'rejected';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
// Photos: our own /parts/... files or https links only (no data:/javascript: URLs)
const imageUrl = (v: unknown) => {
  const s = str(v, 600);
  return /^\/parts\/[\w.-]+$/.test(s) || /^https:\/\/[^\s"'<>]+$/.test(s) ? s : '';
};

const PART_CONDITIONS = ['Новый (Оригинал)', 'Б/у (Контрактный)', 'Дубликат (OEM)', 'Новый', 'Б/У с разбора', 'Восстановленная'];

// Whitelist and clamp everything a seller can send
function sanitizePart(body: any) {
  const images = (Array.isArray(body.images) ? body.images : [body.image]).map(imageUrl).filter(Boolean).slice(0, 8);
  const compatibility = (Array.isArray(body.compatibility) ? body.compatibility : []).slice(0, 20).map((c: any) => ({
    brand: str(c?.brand, 60),
    model: str(c?.model, 80),
    bodyCode: str(c?.bodyCode, 60),
    years: str(c?.years, 30),
    engine: str(c?.engine, 60),
  })).filter((c: any) => c.brand && c.model);
  const stockCount = Math.round(num(body.stockCount, 0, 9999));
  return {
    title: str(body.title, 160),
    category: str(body.category, 80),
    subcategory: str(body.subcategory, 80) || undefined,
    brand: str(body.brand, 60),
    model: str(body.model, 80),
    generation: str(body.generation, 80) || undefined,
    bodyCode: str(body.bodyCode, 80) || undefined,
    partNumber: str(body.partNumber, 60).toUpperCase(),
    priceKgs: Math.round(num(body.priceKgs, 0, 100_000_000)),
    condition: PART_CONDITIONS.includes(body.condition) ? body.condition : 'Новый',
    inStock: stockCount > 0,
    stockCount,
    stockStatus: stockCount > 1 ? 'В наличии' : stockCount === 1 ? 'Осталось мало' : 'Нет в наличии',
    market: str(body.market, 80) || 'Кудайберген',
    storeName: str(body.storeName, 120),
    storeLocation: str(body.storeLocation, 160),
    storeCity: str(body.storeCity, 60) || 'Бишкек',
    sellerPhone: str(body.sellerPhone, 30),
    sellerWhatsapp: str(body.sellerWhatsapp, 30).replace(/\D/g, '') || undefined,
    image: images[0] || '',
    images: images.length ? images : undefined,
    hasCompressionVideo: Boolean(body.hasCompressionVideo),
    compressionBar: body.hasCompressionVideo ? num(body.compressionBar, 0, 30) : undefined,
    videoTitle: str(body.videoTitle, 120) || undefined,
    compatibility: compatibility.length ? compatibility : undefined,
    sku: str(body.sku, 60) || undefined,
    crossNumbers: (Array.isArray(body.crossNumbers) ? body.crossNumbers : String(body.crossNumbers || '').split(/[,;\n]+/))
      .map((x: unknown) => str(x, 40).toUpperCase()).filter(Boolean).slice(0, 30),
    manufacturer: str(body.manufacturer, 60) || undefined,
    warehouseId: str(body.warehouseId, 60) || undefined,
    oldPriceKgs: (() => { const o = Math.round(num(body.oldPriceKgs, 0, 100_000_000)); return o > num(body.priceKgs, 0, 100_000_000) ? o : undefined; })(),
    sellerType: body.sellerType === 'legal' ? 'legal' : 'individual',
    companyName: str(body.companyName, 120) || undefined,
    inn: str(body.inn, 20).replace(/\D/g, '') || undefined,
    containerInfo: str(body.containerInfo, 120) || undefined,
    directionsGuide: str(body.directionsGuide, 300) || undefined,
    paymentMethods: (Array.isArray(body.paymentMethods) ? body.paymentMethods : []).map((p: unknown) => str(p, 40)).filter(Boolean).slice(0, 8),
    countryOfImport: str(body.countryOfImport, 60) || undefined,
    warrantyDays: Math.round(num(body.warrantyDays, 0, 3650)),
    description: str(body.description, 2000) || undefined,
    deliveryAvailable: body.deliveryAvailable !== false,
    pickupAvailable: body.pickupAvailable !== false,
    city: str(body.city, 60) || undefined,
  };
}

const partProblem = (p: ReturnType<typeof sanitizePart>) => {
  if (!p.title) return 'Укажите название запчасти';
  if (!p.partNumber) return 'Укажите OEM артикул';
  if (!p.brand) return 'Укажите марку авто';
  if (!p.priceKgs) return 'Укажите цену';
  if (!/\d{6,}/.test(p.sellerPhone.replace(/\D/g, ''))) return 'Укажите телефон продавца';
  return null;
};

// Public: approved parts only, without moderation details
const publicPart = ({ moderation, ownerId, ...part }: any, verified?: Set<string>, ratings?: Map<string, { sum: number; count: number }>) => {
  const r = ownerId ? ratings?.get(ownerId) : undefined;
  return {
    ...part,
    sellerId: ownerId || undefined,
    sellerVerified: Boolean(ownerId && verified?.has(ownerId)),
    sellerRating: r ? Math.round((r.sum / r.count) * 10) / 10 : undefined,
    sellerReviewsCount: r?.count || 0,
  };
};

const isLive = (l: any) => l.moderation?.status === 'approved' && (l.listingStatus ?? 'active') === 'active';
// Parts on the site: published, in stock (no "on order") and with the seller's own photo
const isPublicPart = (p: any) => isLive(p) && Number(p.stockCount) > 0 && Array.isArray(p.images) && p.images.length > 0;
// Sellers with the crown: checked by an admin in person, or a company with verified documents
const verifiedOwners = async () =>
  new Set((await listRecords<UserRecord>('users')).filter((u) => !u.blocked && (u.verifiedSeller || u.company?.status === 'verified')).map((u) => u.id));

app.get('/api/parts', asyncRoute(async (_req: Request, res: Response) => {
  const [parts, verified, ratings] = await Promise.all([listRecords('parts'), verifiedOwners(), sellerRatings()]);
  res.json({ success: true, parts: parts.filter(isPublicPart).map((p: any) => publicPart(p, verified, ratings)) });
}));

// Seller submission -> moderation queue
app.post('/api/parts', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const owner: UserRecord = (req as any).user;
  const part = sanitizePart({ ...(req.body || {}), sellerType: owner.accountType });
  const problem = partProblem(part)
    || (!part.images?.length ? 'Добавьте хотя бы одно своё фото этой детали' : null)
    || (part.stockCount < 1 ? 'Укажите количество в наличии: товары под заказ на сайте не публикуются' : null);
  if (problem) return res.status(400).json({ success: false, error: problem });

  // Basic flood protection: at most 20 parts waiting for review per phone number
  const phone = part.sellerPhone.replace(/\D/g, '');
  const all = await listRecords('parts');
  const pendingFromPhone = all.filter((p: any) => p.moderation?.status === 'pending' && p.sellerPhone?.replace(/\D/g, '') === phone).length;
  if (pendingFromPhone >= 20) {
    return res.status(429).json({ success: false, error: 'Слишком много заявок на модерации с этого номера. Дождитесь проверки.' });
  }

  const record = {
    id: `part-${randomUUID()}`,
    ...part,
    ownerId: owner.id,
    createdAt: new Date().toISOString(),
    moderation: { status: 'pending' as PartStatus, submittedAt: new Date().toISOString() },
  };
  await insertRecord('parts', record);
  await notifyAdmin(
    `📦 Новая запчасть на модерации\n${record.title}\nOEM ${record.partNumber} · ${record.priceKgs} сом\n` +
      `Продавец: ${record.storeName || record.companyName || '—'}, ${record.sellerPhone}\n` +
      `Проверить: ${SITE_URL} → Панель управления → Автозапчасти`
  );
  res.status(201).json({ success: true, id: record.id, status: 'pending' });
}));

// Lets the admin panel check the password before showing moderation tools
app.get('/api/admin/check', requireAdmin, (req: Request, res: Response) => {
  const actor = (req as any).actor;
  res.json({ success: true, role: actor === 'admin-token' ? 'admin' : actor.role });
});

app.get('/api/admin/parts', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const status = String(req.query.status || 'all');
  const parts = await listRecords('parts');
  res.json({ success: true, parts: status === 'all' ? parts : parts.filter((p: any) => p.moderation?.status === status) });
}));

// Admin-added parts are published immediately
app.post('/api/admin/parts', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const part = sanitizePart(req.body || {});
  const problem = partProblem({ ...part, sellerPhone: part.sellerPhone || '000000' });
  if (problem) return res.status(400).json({ success: false, error: problem });
  const now = new Date().toISOString();
  const record = {
    id: `part-${randomUUID()}`,
    ...part,
    createdAt: now,
    moderation: { status: 'approved' as PartStatus, submittedAt: now, reviewedAt: now, reviewedBy: 'admin' },
  };
  await insertRecord('parts', record);
  res.status(201).json({ success: true, part: publicPart(record) });
}));

app.patch('/api/admin/parts/:id/moderate', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const { action, reason } = req.body || {};
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ success: false, error: 'action должен быть approve или reject' });
  }
  const current = await getRecord<any>('parts', req.params.id);
  if (!current) return res.status(404).json({ success: false, error: 'Запчасть не найдена' });
  const moderation = {
    ...current.moderation,
    status: (action === 'approve' ? 'approved' : 'rejected') as PartStatus,
    reviewedAt: new Date().toISOString(),
    reason: action === 'reject' ? str(reason, 300) || 'Не соответствует правилам' : undefined,
  };
  const updated = await updateRecord('parts', req.params.id, { moderation });
  await notifyUser(current.ownerId, action === 'approve'
    ? `✅ Запчасть «${current.title}» опубликована на KGzone`
    : `❌ Запчасть «${current.title}» не прошла модерацию: ${moderation.reason}\nИсправьте в Личном кабинете: ${SITE_URL}/kabinet`);
  res.json({ success: true, part: updated });
}));

// Edit price / stock / text of a published part
app.patch('/api/admin/parts/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const current = await getRecord<any>('parts', req.params.id);
  if (!current) return res.status(404).json({ success: false, error: 'Запчасть не найдена' });
  const clean = sanitizePart({ ...current, ...(req.body || {}) });
  const updated = await updateRecord('parts', req.params.id, clean);
  res.json({ success: true, part: updated });
}));

app.delete('/api/admin/parts/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const ok = await deleteRecord('parts', req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Запчасть не найдена' });
  res.json({ success: true });
}));

// ==========================================
// PHOTO UPLOADS (Vercel Blob)
// The browser shrinks photos to <= 1600px JPEG before sending, so bodies stay small.
// ==========================================
const uploadHits = new Map<string, number[]>(); // per-instance rate limit: 40 photos / 10 min / IP

app.post('/api/upload', asyncRoute(async (req: Request, res: Response) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ success: false, error: 'Загрузка фото пока не настроена' });
  }
  const ip = (req.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (uploadHits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 40) return res.status(429).json({ success: false, error: 'Слишком много фото. Попробуйте позже.' });

  const m = typeof req.body?.dataUrl === 'string' && req.body.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return res.status(400).json({ success: false, error: 'Нужна картинка JPEG, PNG или WebP' });
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > 2_500_000) return res.status(413).json({ success: false, error: 'Фото слишком большое (максимум 2.5 МБ)' });
  // Check the file really is an image (magic bytes), not just labelled as one
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes.subarray(0, 4).toString('hex') === '89504e47';
  const isWebp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) return res.status(400).json({ success: false, error: 'Файл не похож на картинку' });

  recent.push(now);
  uploadHits.set(ip, recent);
  const ext = isPng ? 'png' : isWebp ? 'webp' : 'jpg';
  const folder = req.body?.kind === 'car' ? 'cars' : 'parts';
  const blob = await put(`${folder}/${randomUUID()}.${ext}`, bytes, { access: 'public', contentType: m[1] });
  res.status(201).json({ success: true, url: blob.url });
}));

// ==========================================
// CAR LISTINGS WITH MODERATION (same flow as parts)
// ==========================================
const CAR_BODY = ['Седан', 'Кроссовер', 'Внедорожник', 'Хэтчбек', 'Минивэн', 'Универсал', 'Пикап', 'Купе', 'Лифтбек'];
const CAR_TRANS = ['Автомат', 'Вариатор', 'Механика', 'Робот'];
const CAR_FUEL = ['Бензин', 'Газ-бензин', 'Дизель', 'Гибрид', 'Электро'];
const CAR_DRIVE = ['Передний', 'Полный (4WD)', 'Задний'];
const CAR_CUSTOMS = ['Растаможен в КР', 'Не растаможен', 'Учет РФ', 'Учет ЕАЭС'];
const pick = (v: unknown, list: string[], fallback: string) => (list.includes(v as string) ? (v as string) : fallback);

function sanitizeCar(body: any) {
  const photos = (Array.isArray(body.photos) ? body.photos : [body.image]).map(imageUrl).filter(Boolean).slice(0, 15);
  const brand = str(body.brand, 60), model = str(body.model, 80);
  const year = Math.round(num(body.year, 1950, new Date().getFullYear() + 1));
  const city = str(body.city, 60) || 'Бишкек';
  return {
    title: `${brand} ${model} ${year}`.trim(),
    brand,
    model,
    generation: str(body.generation, 80) || undefined,
    year,
    priceUsd: Math.round(num(body.priceUsd, 0, 10_000_000)),
    city,
    region: str(body.region, 60) || city,
    bodyType: pick(body.bodyType, CAR_BODY, 'Седан'),
    transmission: pick(body.transmission, CAR_TRANS, 'Автомат'),
    steering: body.steering === 'Правый' ? 'Правый' : 'Левый',
    fuelType: pick(body.fuelType, CAR_FUEL, 'Бензин'),
    engineVolume: num(body.engineVolume, 0, 10),
    powerHp: Math.round(num(body.powerHp, 0, 2000)),
    mileageKm: Math.round(num(body.mileageKm, 0, 3_000_000)),
    drive: pick(body.drive, CAR_DRIVE, 'Передний'),
    customs: pick(body.customs, CAR_CUSTOMS, 'Растаможен в КР'),
    color: str(body.color, 40),
    isExchange: Boolean(body.isExchange),
    // Only an admin can mark a car as CarCheck-verified or a good price
    hasCarCheckPass: false,
    isGoodPrice: false,
    plateNumber: str(body.plateNumber, 20).toUpperCase(),
    vin: str(body.vin, 20).toUpperCase(),
    viewsCount: 0,
    sellerName: str(body.sellerName, 80),
    sellerPhone: str(body.sellerPhone, 30),
    sellerLocation: str(body.sellerLocation, 120) || city,
    description: str(body.description, 3000) || '—',
    features: (Array.isArray(body.features) ? body.features : []).map((f: unknown) => str(f, 60)).filter(Boolean).slice(0, 30),
    image: photos[0] || '',
    photos,
  };
}

const carProblem = (c: ReturnType<typeof sanitizeCar>) => {
  if (!c.brand || !c.model) return 'Укажите марку и модель';
  if (!c.priceUsd) return 'Укажите цену';
  if (!c.sellerName) return 'Укажите имя продавца';
  if (!/\d{6,}/.test(c.sellerPhone.replace(/\D/g, ''))) return 'Укажите телефон продавца';
  return null;
};

const publicCar = ({ moderation, ownerId, ...car }: any, verified?: Set<string>) => ({
  ...car,
  sellerId: ownerId || undefined,
  sellerVerified: Boolean(ownerId && verified?.has(ownerId)),
  publishedDate: car.publishedDate || (car.createdAt ? new Date(car.createdAt).toLocaleDateString('ru-RU') : ''),
});

app.get('/api/cars', asyncRoute(async (_req: Request, res: Response) => {
  const [cars, verified] = await Promise.all([listRecords('cars'), verifiedOwners()]);
  res.json({ success: true, cars: cars.filter(isLive).map((c: any) => publicCar(c, verified)) });
}));

app.post('/api/cars', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const owner: UserRecord = (req as any).user;
  const car = sanitizeCar(req.body || {});
  const problem = carProblem(car);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const phone = car.sellerPhone.replace(/\D/g, '');
  const pendingFromPhone = (await listRecords('cars')).filter(
    (c: any) => c.moderation?.status === 'pending' && c.sellerPhone?.replace(/\D/g, '') === phone
  ).length;
  if (pendingFromPhone >= 5) {
    return res.status(429).json({ success: false, error: 'Слишком много объявлений на проверке с этого номера. Дождитесь модерации.' });
  }
  const now = new Date().toISOString();
  const record = { id: `car-${randomUUID()}`, ...car, ownerId: owner.id, createdAt: now, moderation: { status: 'pending', submittedAt: now } };
  await insertRecord('cars', record);
  await notifyAdmin(
    `🚗 Новое объявление на модерации\n${record.title} · ${record.priceUsd}\n${record.city} · ${record.mileageKm} км\n` +
      `Продавец: ${record.sellerName}, ${record.sellerPhone}\nФото: ${record.photos.length}\n` +
      `Проверить: ${SITE_URL} → Панель управления → Объявления авто`
  );
  res.status(201).json({ success: true, id: record.id, status: 'pending' });
}));

app.get('/api/admin/cars', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const status = String(req.query.status || 'all');
  const cars = await listRecords('cars');
  res.json({ success: true, cars: status === 'all' ? cars : cars.filter((c: any) => c.moderation?.status === status) });
}));

app.patch('/api/admin/cars/:id/moderate', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const { action, reason } = req.body || {};
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ success: false, error: 'action должен быть approve или reject' });
  }
  const current = await getRecord<any>('cars', req.params.id);
  if (!current) return res.status(404).json({ success: false, error: 'Объявление не найдено' });
  const now = new Date().toISOString();
  const updated = await updateRecord('cars', req.params.id, {
    moderation: {
      ...current.moderation,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: now,
      reason: action === 'reject' ? str(reason, 300) || 'Не соответствует правилам' : undefined,
    },
    ...(action === 'approve' ? { publishedDate: new Date().toLocaleDateString('ru-RU') } : {}),
  });
  await notifyUser(current.ownerId, action === 'approve'
    ? `✅ Объявление «${current.title}» опубликовано на KGzone`
    : `❌ Объявление «${current.title}» не прошло модерацию: ${str(reason, 300) || 'Не соответствует правилам'}\nИсправьте в Личном кабинете: ${SITE_URL}/kabinet`);
  res.json({ success: true, car: updated });
}));

app.patch('/api/admin/cars/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const current = await getRecord<any>('cars', req.params.id);
  if (!current) return res.status(404).json({ success: false, error: 'Объявление не найдено' });
  const b = req.body || {};
  const patch: any = {};
  if (b.priceUsd !== undefined) patch.priceUsd = Math.round(num(b.priceUsd, 0, 10_000_000));
  if (b.isUrgent !== undefined) patch.isUrgent = Boolean(b.isUrgent);
  if (b.hasCarCheckPass !== undefined) patch.hasCarCheckPass = Boolean(b.hasCarCheckPass);
  if (b.isGoodPrice !== undefined) patch.isGoodPrice = Boolean(b.isGoodPrice);
  const updated = await updateRecord('cars', req.params.id, patch);
  res.json({ success: true, car: updated });
}));

app.delete('/api/admin/cars/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const ok = await deleteRecord('cars', req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: 'Объявление не найдено' });
  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// Accounts: registration, sign-in (httpOnly session cookie), roles, company profiles,
// seller listings management and admin user management.
// Roles: user (buyer/seller), moderator (moderation queues), admin (everything).
// The first admin is created by entering the ADMIN_TOKEN once ("claim admin").
// ---------------------------------------------------------------------------

type AccountType = 'individual' | 'legal';
type UserRole = 'user' | 'moderator' | 'admin';
type CompanyStatus = 'unverified' | 'pending' | 'verified' | 'needs_docs' | 'rejected' | 'blocked';

interface CompanyProfile {
  name: string;
  inn: string;
  legalAddress: string;
  actualAddress: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  bankDetails: string;
  warehouses?: { id: string; name: string; address: string }[];
  status: CompanyStatus;
  statusComment?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

interface GarageCar {
  id: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  vin?: string;
  mileage?: number;
  oilChangeMileage?: number;
  oilInterval?: number;
  insuranceUntil?: string;
  inspectionUntil?: string;
}

interface UserRecord {
  id: string;
  accountType: AccountType;
  name: string;
  phone: string; // digits only, e.g. 996700123456
  email: string;
  city: string;
  passwordHash: string;
  role: UserRole;
  blocked: boolean;
  tokenVersion: number;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  company?: CompanyProfile;
  garage: GarageCar[];
  termsAcceptedAt?: string;
  verifiedSeller?: boolean; // crown badge: an admin checked this seller in person
  verifiedSellerAt?: string;
  telegramChatId?: string;
  telegramLinkCode?: string;
  telegramLinkExpires?: number;
}

const SESSION_COOKIE = 'kgz_session';
const SESSION_DAYS = 30;
// Derived from ADMIN_TOKEN so no extra secret is needed; SESSION_SECRET overrides it.
// Without either (local development) a random per-process secret is used.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.ADMIN_TOKEN ? createHmac('sha256', process.env.ADMIN_TOKEN).update('kgzone-session-v1').digest('hex') : randomBytes(32).toString('hex'));

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sign = (payload: string) => createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

function makeSessionToken(user: UserRecord) {
  const payload = `${user.id}.${Date.now() + SESSION_DAYS * 86_400_000}.${user.tokenVersion}`;
  return `${payload}.${sign(payload)}`;
}

function setSessionCookie(res: Response, user: UserRecord) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${makeSessionToken(user)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${isProd ? '; Secure' : ''}`
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`);
}

function readCookie(req: Request, name: string) {
  const header = req.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

async function getSessionUser(req: Request): Promise<UserRecord | null> {
  const token = readCookie(req, SESSION_COOKIE);
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [id, exp, version, sig] = parts;
  const expected = sign(`${id}.${exp}.${version}`);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  const user = await getRecord<UserRecord>('users', id);
  if (!user || user.blocked || String(user.tokenVersion) !== version) return null;
  return user;
}

const publicUser = (u: UserRecord) => {
  const { passwordHash, tokenVersion, telegramChatId, telegramLinkCode, telegramLinkExpires, ...rest } = u;
  return { ...rest, telegramLinked: Boolean(telegramChatId) };
};

const normalizePhone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) d = '996' + d.slice(1);
  if (d.length === 9) d = '996' + d;
  return d.length >= 10 && d.length <= 15 ? d : '';
};
const normalizeEmail = (v: unknown) => {
  const e = str(v, 120).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : '';
};

async function findUserByLogin(login: string) {
  const phone = normalizePhone(login);
  const email = normalizeEmail(login);
  const users = await listRecords<UserRecord>('users');
  return users.find((u) => (phone && u.phone === phone) || (email && u.email === email)) || null;
}

// Simple in-memory limiter (per serverless instance) against password guessing and floods
const hitLog = new Map<string, number[]>();
function tooMany(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (hitLog.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  hitLog.set(key, hits);
  return hits.length > limit;
}
const clientIp = (req: Request) => (req.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();

async function audit(actor: UserRecord | 'admin-token', action: string, target: string, details: Record<string, unknown> = {}) {
  await insertRecord('audit', {
    id: `aud-${randomUUID()}`,
    at: new Date().toISOString(),
    actorId: actor === 'admin-token' ? 'admin-token' : actor.id,
    actorName: actor === 'admin-token' ? 'Пароль администратора' : actor.name,
    action,
    target,
    details,
  });
}

function sanitizeCompany(body: any, previous?: CompanyProfile): CompanyProfile {
  return {
    name: str(body?.name, 160),
    inn: str(body?.inn, 20).replace(/\D/g, ''),
    legalAddress: str(body?.legalAddress, 200),
    actualAddress: str(body?.actualAddress, 200),
    contactPerson: str(body?.contactPerson, 120),
    contactPhone: str(body?.contactPhone, 30),
    contactEmail: str(body?.contactEmail, 120),
    bankDetails: str(body?.bankDetails, 400),
    status: previous?.status ?? 'unverified',
    statusComment: previous?.statusComment,
    submittedAt: previous?.submittedAt,
    reviewedAt: previous?.reviewedAt,
    warehouses: previous?.warehouses,
  };
}

// Function declaration (hoisted): routes defined earlier in the file use it
function requireUser(req: Request, res: Response, next: () => void) {
  getSessionUser(req)
    .then((user) => {
      if (!user) return res.status(401).json({ success: false, error: 'Войдите в аккаунт' });
      (req as any).user = user;
      next();
    })
    .catch(() => res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }));
}

// Admin password header OR a signed-in admin (and, unless adminOnly, a moderator)
const staffGuard = (adminOnly: boolean) => (req: Request, res: Response, next: () => void) => {
  if (isAdmin(req)) { (req as any).actor = 'admin-token'; return next(); }
  getSessionUser(req)
    .then((user) => {
      if (user && (user.role === 'admin' || (!adminOnly && user.role === 'moderator'))) {
        (req as any).actor = user;
        return next();
      }
      res.status(401).json({ success: false, error: 'Требуется доступ администратора' });
    })
    .catch(() => res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }));
};
const requireAdminOnly = staffGuard(true);

app.post('/api/auth/register', asyncRoute(async (req: Request, res: Response) => {
  if (tooMany(`reg:${clientIp(req)}`, 10, 60 * 60_000)) {
    return res.status(429).json({ success: false, error: 'Слишком много регистраций. Попробуйте позже.' });
  }
  const b = req.body || {};
  const accountType: AccountType = b.accountType === 'legal' ? 'legal' : 'individual';
  const name = str(b.name, 120);
  const phone = normalizePhone(b.phone);
  const email = b.email ? normalizeEmail(b.email) : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const city = str(b.city, 60) || 'Бишкек';
  if (!name) return res.status(400).json({ success: false, error: 'Укажите имя' });
  if (!phone) return res.status(400).json({ success: false, error: 'Укажите телефон, например +996 700 123 456' });
  if (b.email && !email) return res.status(400).json({ success: false, error: 'Неверный адрес почты' });
  if (password.length < 8) return res.status(400).json({ success: false, error: 'Пароль должен быть не короче 8 символов' });
  if (password.length > 200) return res.status(400).json({ success: false, error: 'Слишком длинный пароль' });
  if (b.acceptTerms !== true) return res.status(400).json({ success: false, error: 'Примите пользовательское соглашение и политику конфиденциальности' });

  let company: CompanyProfile | undefined;
  if (accountType === 'legal') {
    company = sanitizeCompany(b.company);
    if (!company.name) return res.status(400).json({ success: false, error: 'Укажите название компании' });
    if (!/^\d{10,14}$/.test(company.inn)) return res.status(400).json({ success: false, error: 'Укажите ИНН компании (10–14 цифр)' });
  }

  const users = await listRecords<UserRecord>('users');
  if (users.some((u) => u.phone === phone)) return res.status(409).json({ success: false, error: 'Этот телефон уже зарегистрирован. Войдите в аккаунт.' });
  if (email && users.some((u) => u.email === email)) return res.status(409).json({ success: false, error: 'Эта почта уже зарегистрирована' });

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: `usr-${randomUUID()}`,
    accountType,
    name,
    phone,
    email,
    city,
    passwordHash: await hashPassword(password),
    role: 'user',
    blocked: false,
    tokenVersion: 1,
    phoneVerified: false,
    createdAt: now,
    lastLoginAt: now,
    company,
    garage: [],
    termsAcceptedAt: now,
  };
  await insertRecord('users', user);
  setSessionCookie(res, user);
  if (company) await notifyAdmin(`🏢 Новая компания: ${company.name} (ИНН ${company.inn})\n${name}, +${phone}`);
  res.status(201).json({ success: true, user: publicUser(user) });
}));

app.post('/api/auth/login', asyncRoute(async (req: Request, res: Response) => {
  const login = str(req.body?.login, 120);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (tooMany(`login:${clientIp(req)}`, 20, 15 * 60_000) || tooMany(`login:${login.toLowerCase()}`, 8, 15 * 60_000)) {
    return res.status(429).json({ success: false, error: 'Слишком много попыток входа. Подождите 15 минут.' });
  }
  const user = login && password ? await findUserByLogin(login) : null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ success: false, error: 'Неверный телефон/почта или пароль' });
  }
  if (user.blocked) return res.status(403).json({ success: false, error: 'Аккаунт заблокирован. Обратитесь в поддержку.' });
  const updated = (await updateRecord<UserRecord>('users', user.id, { lastLoginAt: new Date().toISOString() })) || user;
  setSessionCookie(res, updated);
  res.json({ success: true, user: publicUser(updated) });
}));

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', asyncRoute(async (req: Request, res: Response) => {
  const user = await getSessionUser(req);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, user: user ? publicUser(user) : null });
}));

app.patch('/api/auth/me', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const b = req.body || {};
  const patch: Partial<UserRecord> = {};
  if (b.name !== undefined) {
    const name = str(b.name, 120);
    if (!name) return res.status(400).json({ success: false, error: 'Укажите имя' });
    patch.name = name;
  }
  if (b.city !== undefined) patch.city = str(b.city, 60) || user.city;
  if (b.email !== undefined) {
    const email = b.email ? normalizeEmail(b.email) : '';
    if (b.email && !email) return res.status(400).json({ success: false, error: 'Неверный адрес почты' });
    if (email && email !== user.email && (await listRecords<UserRecord>('users')).some((u) => u.email === email)) {
      return res.status(409).json({ success: false, error: 'Эта почта уже зарегистрирована' });
    }
    patch.email = email;
  }
  if (b.company !== undefined && user.accountType === 'legal') {
    const next = sanitizeCompany(b.company, user.company);
    if (!next.name) return res.status(400).json({ success: false, error: 'Укажите название компании' });
    if (!/^\d{10,14}$/.test(next.inn)) return res.status(400).json({ success: false, error: 'Укажите ИНН компании (10–14 цифр)' });
    // Changing the legal identity of a verified company requires a new check
    if (user.company?.status === 'verified' && (next.name !== user.company.name || next.inn !== user.company.inn)) {
      next.status = 'unverified';
      next.statusComment = 'Название или ИНН изменены — нужна повторная проверка';
    }
    patch.company = next;
  }
  const updated = await updateRecord<UserRecord>('users', user.id, patch);
  res.json({ success: true, user: publicUser(updated!) });
}));

// Delete own account (privacy policy): the account, its listings and memberships are removed;
// in conversations the name becomes "Удалённый пользователь".
app.delete('/api/auth/me', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!(await verifyPassword(password, user.passwordHash))) return res.status(400).json({ success: false, error: 'Неверный пароль' });
  if (user.role === 'admin') return res.status(400).json({ success: false, error: 'Администратор не может удалить аккаунт. Сначала передайте права другому администратору.' });
  for (const kind of ['parts', 'cars'] as const) {
    for (const l of await listRecords<any>(kind)) if (l.ownerId === user.id) await deleteRecord(kind, l.id);
  }
  for (const m of await listRecords<Membership>('memberships')) if (m.userId === user.id || m.companyId === user.id) await deleteRecord('memberships', m.id);
  for (const c of await listRecords<Conversation>('conversations')) {
    if (c.buyerId === user.id) await updateRecord('conversations', c.id, { buyerName: 'Удалённый пользователь' });
    else if (c.sellerId === user.id) await updateRecord('conversations', c.id, { sellerName: 'Удалённый пользователь' });
  }
  await deleteRecord('users', user.id);
  await audit('admin-token', 'account.deleted', user.id, { by: 'self' });
  clearSessionCookie(res);
  res.json({ success: true });
}));

app.post('/api/auth/password', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const { current, next } = req.body || {};
  if (tooMany(`pwd:${user.id}`, 10, 15 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много попыток. Подождите.' });
  if (typeof current !== 'string' || !(await verifyPassword(current, user.passwordHash))) {
    return res.status(400).json({ success: false, error: 'Текущий пароль неверный' });
  }
  if (typeof next !== 'string' || next.length < 8 || next.length > 200) {
    return res.status(400).json({ success: false, error: 'Новый пароль должен быть не короче 8 символов' });
  }
  // Bumping tokenVersion signs out every other device
  const updated = await updateRecord<UserRecord>('users', user.id, { passwordHash: await hashPassword(next), tokenVersion: user.tokenVersion + 1 });
  setSessionCookie(res, updated!);
  res.json({ success: true });
}));

app.post('/api/auth/forgot', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Восстановление пароля по SMS пока не подключено. Напишите администратору сайта — он сбросит пароль после проверки, что номер ваш.',
  });
});

app.post('/api/auth/company/submit', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  if (user.accountType !== 'legal' || !user.company) return res.status(400).json({ success: false, error: 'Это не аккаунт компании' });
  if (['pending', 'verified', 'blocked'].includes(user.company.status)) {
    return res.status(400).json({ success: false, error: 'Заявка уже на проверке или компания подтверждена' });
  }
  const c = user.company;
  if (!c.legalAddress || !c.contactPerson) return res.status(400).json({ success: false, error: 'Заполните юридический адрес и контактное лицо' });
  const updated = await updateRecord<UserRecord>('users', user.id, {
    company: { ...c, status: 'pending', submittedAt: new Date().toISOString() },
  });
  await notifyAdmin(`🏢 Компания отправлена на проверку: ${c.name} (ИНН ${c.inn})\nПроверить: ${SITE_URL} → Личный кабинет → Пользователи`);
  res.json({ success: true, user: publicUser(updated!) });
}));

app.put('/api/auth/garage', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const list = Array.isArray(req.body?.garage) ? req.body.garage : [];
  const garage: GarageCar[] = list.slice(0, 10).map((c: any) => ({
    id: str(c?.id, 60) || `car-${randomUUID()}`,
    brand: str(c?.brand, 60),
    model: str(c?.model, 80),
    generation: str(c?.generation, 80) || undefined,
    year: c?.year ? Math.round(num(c.year, 1950, new Date().getFullYear() + 1)) : undefined,
    vin: str(c?.vin, 17).toUpperCase() || undefined,
    mileage: c?.mileage ? Math.round(num(c.mileage, 0, 3_000_000)) : undefined,
    oilChangeMileage: c?.oilChangeMileage ? Math.round(num(c.oilChangeMileage, 0, 3_000_000)) : undefined,
    oilInterval: c?.oilInterval ? Math.round(num(c.oilInterval, 1000, 30_000)) : undefined,
    insuranceUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(c?.insuranceUntil || '')) ? c.insuranceUntil : undefined,
    inspectionUntil: /^\d{4}-\d{2}-\d{2}$/.test(String(c?.inspectionUntil || '')) ? c.inspectionUntil : undefined,
  })).filter((c: GarageCar) => c.brand && c.model);
  const updated = await updateRecord<UserRecord>('users', user.id, { garage });
  res.json({ success: true, user: publicUser(updated!) });
}));

// One-time bootstrap: a signed-in user who knows ADMIN_TOKEN becomes an admin
app.post('/api/auth/claim-admin', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  if (tooMany(`claim:${clientIp(req)}`, 5, 60 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много попыток' });
  const token = process.env.ADMIN_TOKEN;
  const given = Buffer.from(String(req.body?.adminToken || ''));
  if (!token || given.length !== Buffer.byteLength(token) || !timingSafeEqual(given, Buffer.from(token))) {
    return res.status(401).json({ success: false, error: 'Неверный пароль администратора' });
  }
  const updated = await updateRecord<UserRecord>('users', user.id, { role: 'admin' });
  await audit(user, 'claim-admin', user.id);
  res.json({ success: true, user: publicUser(updated!) });
}));

// --- Seller's own listings -------------------------------------------------

type ListingKind = 'parts' | 'cars';
const listingKind = (v: string): ListingKind | null => (v === 'parts' || v === 'cars' ? v : null);

app.get('/api/my/listings', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const [parts, cars] = await Promise.all([listRecords('parts'), listRecords('cars')]);
  res.json({
    success: true,
    parts: parts.filter((p: any) => p.ownerId === user.id),
    cars: cars.filter((c: any) => c.ownerId === user.id),
  });
}));

async function ownListing(req: Request, res: Response) {
  const user: UserRecord = (req as any).user;
  const kind = listingKind(req.params.kind);
  if (!kind) { res.status(404).json({ success: false, error: 'Не найдено' }); return null; }
  const item: any = await getRecord(kind, req.params.id);
  if (!item || item.ownerId !== user.id) { res.status(404).json({ success: false, error: 'Объявление не найдено' }); return null; }
  return { kind, item, user };
}

// Edit: price/stock-only changes stay published, anything else goes back to moderation
app.patch('/api/my/:kind/:id', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const own = await ownListing(req, res);
  if (!own) return;
  const { kind, item } = own;
  const merged = { ...item, ...(req.body || {}) };
  const clean: any = kind === 'parts' ? sanitizePart(merged) : sanitizeCar(merged);
  const problem = kind === 'parts' ? partProblem(clean) : carProblem(clean);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const quickFields = kind === 'parts' ? ['priceKgs', 'stockCount', 'inStock', 'stockStatus'] : ['priceUsd'];
  // Compare what the seller actually sent (re-sanitizing fills defaults that would look like changes)
  const body = req.body || {};
  const changed = Object.keys(body).filter((k) => k in clean && JSON.stringify(clean[k]) !== JSON.stringify(item[k]));
  const needsReview = changed.some((k) => !quickFields.includes(k));
  const patch: any = { ...clean, updatedAt: new Date().toISOString() };
  // Keep fields only an admin may set
  if (kind === 'cars') { patch.hasCarCheckPass = item.hasCarCheckPass; patch.isGoodPrice = item.isGoodPrice; patch.viewsCount = item.viewsCount; }
  if (kind === 'parts') patch.views = item.views;
  if (needsReview && item.moderation?.status !== 'pending') {
    patch.moderation = { status: 'pending', submittedAt: new Date().toISOString(), reason: 'Изменено продавцом' };
  }
  const updated = await updateRecord(kind, item.id, patch);
  if (needsReview) await notifyAdmin(`✏️ Объявление изменено и ждёт проверки: ${clean.title}`);
  res.json({ success: true, item: updated, needsReview });
}));

app.post('/api/my/:kind/:id/status', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const own = await ownListing(req, res);
  if (!own) return;
  const status = ['active', 'inactive', 'sold'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ success: false, error: 'Неверный статус' });
  const updated = await updateRecord(own.kind, own.item.id, { listingStatus: status, statusChangedAt: new Date().toISOString() });
  res.json({ success: true, item: updated });
}));

// "Поднять": moves an approved, active listing to the top, at most once a day
app.post('/api/my/:kind/:id/raise', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const own = await ownListing(req, res);
  if (!own) return;
  const { kind, item } = own;
  if (item.moderation?.status !== 'approved' || (item.listingStatus ?? 'active') !== 'active') {
    return res.status(400).json({ success: false, error: 'Поднять можно только опубликованное активное объявление' });
  }
  const last = Date.parse(item.raisedAt || item.createdAt || 0);
  const wait = last + 86_400_000 - Date.now();
  if (wait > 0) return res.status(429).json({ success: false, error: `Поднять снова можно через ${Math.ceil(wait / 3_600_000)} ч.` });
  const updated = await updateRecord(kind, item.id, { raisedAt: new Date().toISOString() });
  res.json({ success: true, item: updated });
}));

app.delete('/api/my/:kind/:id', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const own = await ownListing(req, res);
  if (!own) return;
  await deleteRecord(own.kind, own.item.id);
  res.json({ success: true });
}));

// View / contact counters for database listings (approximate; one hit per IP per listing per hour)
app.post('/api/stats/:kind/:id', asyncRoute(async (req: Request, res: Response) => {
  const kind = listingKind(req.params.kind);
  const type = req.body?.type === 'contact' ? 'contact' : 'view';
  if (!kind) return res.status(404).json({ success: false });
  if (tooMany(`stat:${type}:${kind}:${req.params.id}:${clientIp(req)}`, 1, 60 * 60_000)) return res.json({ success: true });
  const item: any = await getRecord(kind, req.params.id);
  if (!item) return res.json({ success: true });
  const field = type === 'contact' ? 'contactsCount' : kind === 'cars' ? 'viewsCount' : 'views';
  await updateRecord(kind, item.id, { [field]: (item[field] || 0) + 1 });
  res.json({ success: true });
}));

app.get('/api/my/orders', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const orders = await listRecords('orders');
  res.json({ success: true, orders: orders.filter((o: any) => o.userId === user.id) });
}));

// --- Admin: users, companies, audit log ------------------------------------

app.get('/api/admin/users', requireAdminOnly, asyncRoute(async (_req: Request, res: Response) => {
  const [users, parts, cars] = await Promise.all([listRecords<UserRecord>('users'), listRecords('parts'), listRecords('cars')]);
  const counts = new Map<string, number>();
  [...parts, ...cars].forEach((l: any) => l.ownerId && counts.set(l.ownerId, (counts.get(l.ownerId) || 0) + 1));
  res.json({ success: true, users: users.map((u) => ({ ...publicUser(u), listingsCount: counts.get(u.id) || 0 })) });
}));

app.patch('/api/admin/users/:id', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  const actor = (req as any).actor as UserRecord | 'admin-token';
  const target = await getRecord<UserRecord>('users', req.params.id);
  if (!target) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  const b = req.body || {};
  const patch: Partial<UserRecord> = {};
  if (b.role !== undefined) {
    if (!['user', 'moderator', 'admin'].includes(b.role)) return res.status(400).json({ success: false, error: 'Неверная роль' });
    if (actor !== 'admin-token' && actor.id === target.id && b.role !== 'admin') {
      return res.status(400).json({ success: false, error: 'Нельзя снять права администратора с самого себя' });
    }
    patch.role = b.role;
  }
  if (b.blocked !== undefined) {
    if (actor !== 'admin-token' && actor.id === target.id) return res.status(400).json({ success: false, error: 'Нельзя заблокировать самого себя' });
    patch.blocked = Boolean(b.blocked);
    if (patch.blocked) patch.tokenVersion = target.tokenVersion + 1; // sign out everywhere
  }
  if (b.verifiedSeller !== undefined) {
    patch.verifiedSeller = Boolean(b.verifiedSeller);
    patch.verifiedSellerAt = patch.verifiedSeller ? new Date().toISOString() : undefined;
  }
  if (b.companyStatus !== undefined && target.company) {
    const statuses: CompanyStatus[] = ['unverified', 'pending', 'verified', 'needs_docs', 'rejected', 'blocked'];
    if (!statuses.includes(b.companyStatus)) return res.status(400).json({ success: false, error: 'Неверный статус компании' });
    patch.company = { ...target.company, status: b.companyStatus, statusComment: str(b.companyComment, 500) || undefined, reviewedAt: new Date().toISOString() };
  }
  const updated = await updateRecord<UserRecord>('users', target.id, patch);
  await audit(actor, 'update-user', target.id, { ...b });
  if (patch.verifiedSeller && !target.verifiedSeller) {
    await notifyUser(target.id, '👑 Поздравляем! KGzone отметил вас как проверенного продавца. Теперь рядом с вашими объявлениями виден значок короны.');
  }
  res.json({ success: true, user: publicUser(updated!) });
}));

// Generates a temporary password the admin passes to the user (after checking the phone is theirs)
app.post('/api/admin/users/:id/reset-password', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  const actor = (req as any).actor as UserRecord | 'admin-token';
  const target = await getRecord<UserRecord>('users', req.params.id);
  if (!target) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
  const temp = randomBytes(6).toString('base64url');
  await updateRecord<UserRecord>('users', target.id, { passwordHash: await hashPassword(temp), tokenVersion: target.tokenVersion + 1 });
  await audit(actor, 'reset-password', target.id);
  res.json({ success: true, tempPassword: temp });
}));

app.get('/api/admin/audit', requireAdminOnly, asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, entries: (await listRecords('audit')).slice(0, 300) });
}));

// ---------------------------------------------------------------------------
// Messages between buyers and sellers (per listing) and seller reviews.
// A buyer can review a seller only after writing to them about one of their listings.
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  from: string; // user id
  text: string;
  at: string;
}

interface Conversation {
  id: string;
  kind: ListingKind;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  messages: ChatMessage[];
  lastAt: string;
  readAt: Record<string, string>; // user id -> last read time
}

const MAX_MESSAGES = 300;

const conversationView = (c: Conversation, me: string) => {
  const lastRead = c.readAt?.[me] || '';
  const isBuyer = c.buyerId === me;
  return {
    id: c.id,
    kind: c.kind,
    listingId: c.listingId,
    listingTitle: c.listingTitle,
    listingImage: c.listingImage,
    role: isBuyer ? 'buyer' : 'seller',
    otherName: isBuyer ? c.sellerName : c.buyerName,
    lastMessage: c.messages[c.messages.length - 1] || null,
    lastAt: c.lastAt,
    unread: c.messages.filter((m) => m.from !== me && m.at > lastRead).length,
  };
};

async function myConversations(user: UserRecord) {
  const ctx = await companyContext(user);
  const companyId = ctx && ctx.can('messages') ? ctx.companyId : null;
  return (await listRecords<Conversation>('conversations')).filter(
    (c) => c.buyerId === user.id || c.sellerId === user.id || (companyId && c.sellerId === companyId)
  );
}

async function canAccessConversation(user: UserRecord, c: Conversation) {
  if (c.buyerId === user.id || c.sellerId === user.id) return true;
  const ctx = await companyContext(user);
  return Boolean(ctx && ctx.can('messages') && c.sellerId === ctx.companyId);
}

const cleanText = (v: unknown) => str(v, 2000).replace(/\s+\n/g, '\n');

async function notifyChat(c: Conversation, from: UserRecord, text: string) {
  const to = from.id === c.buyerId ? c.sellerId : c.buyerId;
  if (tooMany(`tgchat:${c.id}:${to}`, 3, 10 * 60_000)) return;
  await notifyUser(to, `💬 Новое сообщение по «${c.listingTitle}»\n${from.company?.name || from.name}: ${text.slice(0, 300)}\n\nОтветить: ${SITE_URL}/kabinet`);
}

// Start (or continue) a conversation about a listing
app.post('/api/conversations', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  if (tooMany(`msg:${user.id}`, 30, 10 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много сообщений. Подождите немного.' });
  const kind = listingKind(String(req.body?.kind || ''));
  const text = cleanText(req.body?.text);
  if (!kind) return res.status(400).json({ success: false, error: 'Неверное объявление' });
  if (!text) return res.status(400).json({ success: false, error: 'Напишите сообщение' });
  const listing: any = await getRecord(kind, str(req.body?.listingId, 80));
  if (!listing || !listing.ownerId || !isLive(listing)) return res.status(404).json({ success: false, error: 'Объявление не найдено или снято с публикации' });
  if (listing.ownerId === user.id) return res.status(400).json({ success: false, error: 'Это ваше объявление' });
  const seller = await getRecord<UserRecord>('users', listing.ownerId);
  if (!seller || seller.blocked) return res.status(404).json({ success: false, error: 'Продавец недоступен' });

  const now = new Date().toISOString();
  const message: ChatMessage = { id: randomUUID(), from: user.id, text, at: now };
  const existing = (await myConversations(user)).find((c) => c.kind === kind && c.listingId === listing.id && c.buyerId === user.id);
  if (existing) {
    const updated = await updateRecord<Conversation>('conversations', existing.id, {
      messages: [...existing.messages, message].slice(-MAX_MESSAGES),
      lastAt: now,
      readAt: { ...existing.readAt, [user.id]: now },
    });
    await notifyChat(updated!, user, text);
    return res.json({ success: true, conversation: conversationView(updated!, user.id) });
  }
  const conv: Conversation = {
    id: `conv-${randomUUID()}`,
    kind,
    listingId: listing.id,
    listingTitle: listing.title,
    listingImage: listing.image || '',
    buyerId: user.id,
    buyerName: user.company?.name || user.name,
    sellerId: seller.id,
    sellerName: seller.company?.name || seller.name,
    messages: [message],
    lastAt: now,
    readAt: { [user.id]: now },
  };
  await insertRecord('conversations', conv);
  await notifyChat(conv, user, text);
  res.status(201).json({ success: true, conversation: conversationView(conv, user.id) });
}));

app.get('/api/conversations', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const list = (await myConversations(user)).map((c) => conversationView(c, user.id)).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, conversations: list, unread: list.reduce((n, c) => n + c.unread, 0) });
}));

app.get('/api/conversations/:id', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const c = await getRecord<Conversation>('conversations', req.params.id);
  if (!c || !(await canAccessConversation(user, c))) return res.status(404).json({ success: false, error: 'Диалог не найден' });
  const updated = await updateRecord<Conversation>('conversations', c.id, { readAt: { ...c.readAt, [user.id]: new Date().toISOString() } });
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    conversation: conversationView(updated!, user.id),
    messages: updated!.messages.map((m) => ({ ...m, mine: m.from === user.id })),
  });
}));

app.post('/api/conversations/:id/messages', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  if (tooMany(`msg:${user.id}`, 30, 10 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много сообщений. Подождите немного.' });
  const text = cleanText(req.body?.text);
  if (!text) return res.status(400).json({ success: false, error: 'Напишите сообщение' });
  const c = await getRecord<Conversation>('conversations', req.params.id);
  if (!c || !(await canAccessConversation(user, c))) return res.status(404).json({ success: false, error: 'Диалог не найден' });
  const now = new Date().toISOString();
  const updated = await updateRecord<Conversation>('conversations', c.id, {
    messages: [...c.messages, { id: randomUUID(), from: user.id, text, at: now }].slice(-MAX_MESSAGES),
    lastAt: now,
    readAt: { ...c.readAt, [user.id]: now },
  });
  await notifyChat(c, user, text);
  res.json({ success: true, messages: updated!.messages.map((m) => ({ ...m, mine: m.from === user.id })) });
}));

// --- Seller reviews ---------------------------------------------------------

interface SellerReview {
  id: string;
  sellerId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  listingTitle: string;
  createdAt: string;
  hidden?: boolean;
}

async function sellerRatings() {
  const map = new Map<string, { sum: number; count: number }>();
  for (const r of await listRecords<SellerReview>('sellerReviews')) {
    if (r.hidden) continue;
    const m = map.get(r.sellerId) || { sum: 0, count: 0 };
    m.sum += r.rating;
    m.count += 1;
    map.set(r.sellerId, m);
  }
  return map;
}

app.get('/api/sellers/:id/reviews', asyncRoute(async (req: Request, res: Response) => {
  const seller = await getRecord<UserRecord>('users', req.params.id);
  if (!seller) return res.status(404).json({ success: false, error: 'Продавец не найден' });
  const reviews = (await listRecords<SellerReview>('sellerReviews')).filter((r) => r.sellerId === seller.id && !r.hidden);
  const viewer = await getSessionUser(req);
  let canReview = false;
  if (viewer && viewer.id !== seller.id) {
    const talked = (await myConversations(viewer)).some((c) => c.buyerId === viewer.id && c.sellerId === seller.id);
    canReview = talked && !reviews.some((r) => r.authorId === viewer.id);
  }
  res.json({
    success: true,
    seller: {
      id: seller.id,
      name: seller.company?.name || seller.name,
      accountType: seller.accountType,
      verified: seller.company?.status === 'verified',
      since: seller.createdAt,
    },
    rating: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null,
    reviews: reviews.map(({ authorId, ...r }) => r),
    canReview,
  });
}));

app.post('/api/sellers/:id/reviews', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const seller = await getRecord<UserRecord>('users', req.params.id);
  if (!seller || seller.id === user.id) return res.status(400).json({ success: false, error: 'Нельзя оставить отзыв этому продавцу' });
  const conv = (await myConversations(user)).find((c) => c.buyerId === user.id && c.sellerId === seller.id);
  if (!conv) return res.status(403).json({ success: false, error: 'Отзыв можно оставить после переписки с продавцом' });
  const all = await listRecords<SellerReview>('sellerReviews');
  if (all.some((r) => r.sellerId === seller.id && r.authorId === user.id)) return res.status(409).json({ success: false, error: 'Вы уже оставили отзыв этому продавцу' });
  const rating = Math.round(num(req.body?.rating, 1, 5));
  const text = str(req.body?.text, 1000);
  if (!rating) return res.status(400).json({ success: false, error: 'Поставьте оценку от 1 до 5' });
  const review: SellerReview = {
    id: `srv-${randomUUID()}`,
    sellerId: seller.id,
    authorId: user.id,
    authorName: user.name.split(' ')[0],
    rating,
    text,
    listingTitle: conv.listingTitle,
    createdAt: new Date().toISOString(),
  };
  await insertRecord('sellerReviews', review);
  res.status(201).json({ success: true });
}));

// Admin can hide abusive reviews
app.get('/api/admin/seller-reviews', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, reviews: await listRecords('sellerReviews') });
}));
app.patch('/api/admin/seller-reviews/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const updated = await updateRecord('sellerReviews', req.params.id, { hidden: Boolean(req.body?.hidden) });
  if (!updated) return res.status(404).json({ success: false, error: 'Отзыв не найден' });
  await audit((req as any).actor, req.body?.hidden ? 'hide-review' : 'show-review', req.params.id);
  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// Company (business) cabinet: employees with roles, catalog management, bulk actions,
// CSV import/export, warehouses, company orders, statistics and a company action log.
// A company is identified by its owner's user id (the legal-entity account).
// Permissions are checked here on the server for every request.
// ---------------------------------------------------------------------------

type StaffRole = 'owner' | 'shop_admin' | 'sales_manager' | 'warehouse' | 'accountant';
type Permission = 'catalog.edit' | 'stock.edit' | 'import' | 'export' | 'orders' | 'orders.view' | 'messages' | 'staff' | 'warehouses' | 'company.edit' | 'finance' | 'audit';

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ['catalog.edit', 'stock.edit', 'import', 'export', 'orders', 'orders.view', 'messages', 'staff', 'warehouses', 'company.edit', 'finance', 'audit'],
  shop_admin: ['catalog.edit', 'stock.edit', 'import', 'export', 'orders', 'orders.view', 'messages', 'warehouses', 'company.edit', 'audit'],
  sales_manager: ['orders', 'orders.view', 'messages', 'export'],
  warehouse: ['stock.edit', 'export'],
  accountant: ['finance', 'orders.view', 'export'],
};
const STAFF_ROLES = Object.keys(ROLE_PERMISSIONS).filter((r) => r !== 'owner') as StaffRole[];

interface Membership {
  id: string;
  companyId: string;
  userId: string;
  role: StaffRole;
  addedBy: string;
  createdAt: string;
}

interface Warehouse {
  id: string;
  name: string;
  address: string;
}

interface CompanyContext {
  companyId: string;
  owner: UserRecord;
  role: StaffRole;
  can: (p: Permission) => boolean;
}

async function companyContext(user: UserRecord): Promise<CompanyContext | null> {
  const make = (owner: UserRecord, role: StaffRole): CompanyContext => ({
    companyId: owner.id,
    owner,
    role,
    can: (p) => ROLE_PERMISSIONS[role].includes(p),
  });
  if (user.accountType === 'legal' && user.company) return make(user, 'owner');
  const m = (await listRecords<Membership>('memberships')).find((x) => x.userId === user.id);
  if (!m) return null;
  const owner = await getRecord<UserRecord>('users', m.companyId);
  if (!owner || owner.blocked || !owner.company) return null;
  return make(owner, m.role);
}

// requireUser + company membership + (optionally) a permission
const requireCompany = (perm?: Permission) => (req: Request, res: Response, next: () => void) => {
  requireUser(req, res, () => {
    companyContext((req as any).user)
      .then((ctx) => {
        if (!ctx) return res.status(403).json({ success: false, error: 'Нет доступа к кабинету компании' });
        if (perm && !ctx.can(perm)) return res.status(403).json({ success: false, error: 'У вашей роли нет доступа к этому действию' });
        (req as any).company = ctx;
        next();
      })
      .catch(() => res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }));
  });
};

const companyAudit = (ctx: CompanyContext, actor: UserRecord, action: string, target: string, details: Record<string, unknown> = {}) =>
  insertRecord('audit', {
    id: `aud-${randomUUID()}`,
    at: new Date().toISOString(),
    companyId: ctx.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action,
    target,
    details,
  });

const companyParts = async (companyId: string) => (await listRecords('parts')).filter((p: any) => p.ownerId === companyId);

// Listings of verified companies are trusted and published right away; others go to moderation
const initialModeration = (ctx: CompanyContext) => {
  const now = new Date().toISOString();
  return ctx.owner.company?.status === 'verified'
    ? { status: 'approved' as const, submittedAt: now, reviewedAt: now, reason: 'Проверенная компания' }
    : { status: 'pending' as const, submittedAt: now };
};

const companyPartDefaults = (ctx: CompanyContext) => ({
  sellerType: 'legal',
  companyName: ctx.owner.company!.name,
  inn: ctx.owner.company!.inn,
  storeName: ctx.owner.company!.name,
  storeCity: ctx.owner.city,
  sellerPhone: ctx.owner.company!.contactPhone || `+${ctx.owner.phone}`,
});

app.get('/api/company', requireCompany(), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const c = ctx.owner.company!;
  res.json({
    success: true,
    role: ctx.role,
    permissions: ROLE_PERMISSIONS[ctx.role],
    company: {
      id: ctx.companyId,
      name: c.name,
      inn: c.inn,
      status: c.status,
      city: ctx.owner.city,
      legalAddress: c.legalAddress,
      actualAddress: c.actualAddress,
      contactPhone: c.contactPhone,
      bankDetails: ctx.can('finance') ? c.bankDetails : undefined,
      warehouses: (c as any).warehouses || [],
    },
  });
}));

// --- Employees ---

app.get('/api/company/staff', requireCompany('staff'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const members = (await listRecords<Membership>('memberships')).filter((m) => m.companyId === ctx.companyId);
  const users = new Map((await listRecords<UserRecord>('users')).map((u) => [u.id, u]));
  res.json({
    success: true,
    staff: members.map((m) => {
      const u = users.get(m.userId);
      return { id: m.id, userId: m.userId, role: m.role, createdAt: m.createdAt, name: u?.name || '—', phone: u?.phone || '', blocked: Boolean(u?.blocked) };
    }),
  });
}));

app.post('/api/company/staff', requireCompany('staff'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const actor: UserRecord = (req as any).user;
  const role = STAFF_ROLES.includes(req.body?.role) ? (req.body.role as StaffRole) : null;
  if (!role) return res.status(400).json({ success: false, error: 'Выберите роль сотрудника' });
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ success: false, error: 'Укажите телефон сотрудника' });
  const target = (await listRecords<UserRecord>('users')).find((u) => u.phone === phone);
  if (!target) return res.status(404).json({ success: false, error: 'Пользователь с таким телефоном не найден. Попросите сотрудника сначала зарегистрироваться на сайте как физическое лицо.' });
  if (target.id === ctx.companyId) return res.status(400).json({ success: false, error: 'Это владелец компании' });
  if (target.accountType === 'legal') return res.status(400).json({ success: false, error: 'Сотрудником может быть только аккаунт физического лица' });
  const memberships = await listRecords<Membership>('memberships');
  if (memberships.some((m) => m.userId === target.id)) return res.status(409).json({ success: false, error: 'Этот пользователь уже работает в компании на KGzone' });
  if (memberships.filter((m) => m.companyId === ctx.companyId).length >= 50) return res.status(400).json({ success: false, error: 'Слишком много сотрудников' });
  const m: Membership = { id: `mem-${randomUUID()}`, companyId: ctx.companyId, userId: target.id, role, addedBy: actor.id, createdAt: new Date().toISOString() };
  await insertRecord('memberships', m);
  await companyAudit(ctx, actor, 'staff-add', target.id, { name: target.name, role });
  res.status(201).json({ success: true });
}));

app.patch('/api/company/staff/:id', requireCompany('staff'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const m = await getRecord<Membership>('memberships', req.params.id);
  if (!m || m.companyId !== ctx.companyId) return res.status(404).json({ success: false, error: 'Сотрудник не найден' });
  const role = STAFF_ROLES.includes(req.body?.role) ? (req.body.role as StaffRole) : null;
  if (!role) return res.status(400).json({ success: false, error: 'Выберите роль сотрудника' });
  await updateRecord('memberships', m.id, { role });
  await companyAudit(ctx, (req as any).user, 'staff-role', m.userId, { role });
  res.json({ success: true });
}));

app.delete('/api/company/staff/:id', requireCompany('staff'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const m = await getRecord<Membership>('memberships', req.params.id);
  if (!m || m.companyId !== ctx.companyId) return res.status(404).json({ success: false, error: 'Сотрудник не найден' });
  await deleteRecord('memberships', m.id);
  await companyAudit(ctx, (req as any).user, 'staff-remove', m.userId);
  res.json({ success: true });
}));

// An employee can leave the company themselves
app.delete('/api/company/membership', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const m = (await listRecords<Membership>('memberships')).find((x) => x.userId === user.id);
  if (!m) return res.status(404).json({ success: false, error: 'Вы не состоите в компании' });
  await deleteRecord('memberships', m.id);
  res.json({ success: true });
}));

// --- Warehouses ---

app.put('/api/company/warehouses', requireCompany('warehouses'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const list = Array.isArray(req.body?.warehouses) ? req.body.warehouses : [];
  const warehouses: Warehouse[] = list.slice(0, 20).map((w: any) => ({
    id: str(w?.id, 60) || `wh-${randomUUID().slice(0, 8)}`,
    name: str(w?.name, 80),
    address: str(w?.address, 200),
  })).filter((w: Warehouse) => w.name);
  await updateRecord<UserRecord>('users', ctx.companyId, { company: { ...ctx.owner.company!, warehouses } as any });
  await companyAudit(ctx, (req as any).user, 'warehouses', ctx.companyId, { count: warehouses.length });
  res.json({ success: true, warehouses });
}));

// --- Catalog ---

app.get('/api/company/parts', requireCompany(), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  res.json({ success: true, parts: await companyParts(ctx.companyId) });
}));

app.post('/api/company/parts', requireCompany('catalog.edit'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const part = sanitizePart({ ...(req.body || {}), ...companyPartDefaults(ctx) });
  const problem = partProblem(part);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const now = new Date().toISOString();
  const record = { id: `part-${randomUUID()}`, ...part, ownerId: ctx.companyId, createdBy: (req as any).user.id, createdAt: now, moderation: initialModeration(ctx) };
  await insertRecord('parts', record);
  await companyAudit(ctx, (req as any).user, 'part-create', record.id, { title: record.title });
  res.status(201).json({ success: true, part: record });
}));

const STOCK_FIELDS = ['stockCount', 'warehouseId'];

app.patch('/api/company/parts/:id', requireCompany(), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const item: any = await getRecord('parts', req.params.id);
  if (!item || item.ownerId !== ctx.companyId) return res.status(404).json({ success: false, error: 'Товар не найден' });
  const body = req.body || {};
  const keys = Object.keys(body);
  const stockOnly = keys.every((k) => STOCK_FIELDS.includes(k));
  if (!(ctx.can('catalog.edit') || (stockOnly && ctx.can('stock.edit')))) {
    return res.status(403).json({ success: false, error: 'У вашей роли нет доступа к этому действию' });
  }
  const clean: any = sanitizePart({ ...item, ...body, ...companyPartDefaults(ctx) });
  const problem = partProblem(clean);
  if (problem) return res.status(400).json({ success: false, error: problem });
  const quick = ['priceKgs', 'oldPriceKgs', 'stockCount', 'warehouseId', 'inStock', 'stockStatus'];
  const changed = keys.filter((k) => k in clean && JSON.stringify(clean[k]) !== JSON.stringify(item[k]));
  const patch: any = { ...clean, views: item.views, updatedAt: new Date().toISOString() };
  if (changed.some((k) => !quick.includes(k)) && ctx.owner.company?.status !== 'verified') {
    patch.moderation = { status: 'pending', submittedAt: new Date().toISOString(), reason: 'Изменено продавцом' };
  }
  const updated = await updateRecord('parts', item.id, patch);
  await companyAudit(ctx, (req as any).user, 'part-edit', item.id, { fields: changed });
  res.json({ success: true, part: updated });
}));

// Bulk actions on selected items
app.post('/api/company/parts/bulk', requireCompany(), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const actor: UserRecord = (req as any).user;
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 1000).map((x: unknown) => String(x)) : [];
  const action = String(req.body?.action || '');
  const value = Number(req.body?.value);
  const needs: Record<string, Permission> = { price: 'catalog.edit', discount: 'catalog.edit', clearDiscount: 'catalog.edit', stock: 'stock.edit', archive: 'catalog.edit', activate: 'catalog.edit', sold: 'catalog.edit', delete: 'catalog.edit', warehouse: 'stock.edit' };
  if (!needs[action]) return res.status(400).json({ success: false, error: 'Неизвестное действие' });
  if (!ctx.can(needs[action])) return res.status(403).json({ success: false, error: 'У вашей роли нет доступа к этому действию' });
  if (['price', 'discount', 'stock'].includes(action) && !Number.isFinite(value)) return res.status(400).json({ success: false, error: 'Укажите значение' });
  const mine = new Set((await companyParts(ctx.companyId)).map((p: any) => p.id));
  let done = 0;
  for (const id of ids) {
    if (!mine.has(id)) continue;
    const p: any = await getRecord('parts', id);
    if (!p) continue;
    const now = new Date().toISOString();
    if (action === 'delete') { await deleteRecord('parts', id); done++; continue; }
    let patch: any = {};
    if (action === 'price') {
      // value: percent change when mode=percent, otherwise a new fixed price
      const next = req.body?.mode === 'percent' ? p.priceKgs * (1 + value / 100) : value;
      patch.priceKgs = Math.max(1, Math.round(next));
    } else if (action === 'discount') {
      if (value <= 0 || value >= 90) return res.status(400).json({ success: false, error: 'Скидка от 1 до 89%' });
      const base = p.oldPriceKgs || p.priceKgs;
      patch = { oldPriceKgs: base, priceKgs: Math.max(1, Math.round(base * (1 - value / 100))) };
    } else if (action === 'clearDiscount') {
      if (p.oldPriceKgs) patch = { priceKgs: p.oldPriceKgs, oldPriceKgs: undefined };
    } else if (action === 'stock') {
      const count = Math.max(0, Math.round(value));
      patch = { stockCount: count, inStock: count > 0, stockStatus: count > 1 ? 'В наличии' : count === 1 ? 'Осталось мало' : 'Нет в наличии' };
    } else if (action === 'warehouse') {
      patch = { warehouseId: str(req.body?.warehouseId, 60) || undefined };
    } else if (action === 'archive') patch = { listingStatus: 'inactive' };
    else if (action === 'activate') patch = { listingStatus: 'active' };
    else if (action === 'sold') patch = { listingStatus: 'sold' };
    await updateRecord('parts', id, { ...patch, updatedAt: now });
    done++;
  }
  await companyAudit(ctx, actor, `bulk-${action}`, ctx.companyId, { count: done, value: Number.isFinite(value) ? value : undefined });
  res.json({ success: true, updated: done });
}));

// CSV import (rows already parsed in the browser). Max 500 rows per request.
app.post('/api/company/import', requireCompany('import'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const actor: UserRecord = (req as any).user;
  const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ success: false, error: 'Файл пустой' });
  if (rows.length > 500) return res.status(400).json({ success: false, error: 'Не больше 500 строк за раз. Разделите файл на части.' });
  if (tooMany(`import:${ctx.companyId}`, 20, 60 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много загрузок. Попробуйте через час.' });

  // Rows with an SKU that already exists update that item instead of creating a duplicate
  const existing = await companyParts(ctx.companyId);
  const bySku = new Map(existing.filter((p: any) => p.sku).map((p: any) => [p.sku, p]));
  const errors: { row: number; error: string }[] = [];
  let created = 0, updated = 0;
  const moderation = initialModeration(ctx);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const prev: any = r.sku ? bySku.get(str(r.sku, 60)) : undefined;
    const part: any = sanitizePart({ ...(prev || {}), ...r, ...companyPartDefaults(ctx) });
    const problem = partProblem(part);
    if (problem) { errors.push({ row: i + 2, error: problem }); continue; }
    const now = new Date().toISOString();
    if (prev) {
      await updateRecord('parts', prev.id, { ...part, views: prev.views, updatedAt: now, ...(ctx.owner.company?.status === 'verified' ? {} : { moderation }) });
      updated++;
    } else {
      await insertRecord('parts', { id: `part-${randomUUID()}`, ...part, ownerId: ctx.companyId, createdBy: actor.id, createdAt: now, moderation });
      created++;
    }
  }
  const noPhoto = (await companyParts(ctx.companyId)).filter((p: any) => !p.images?.length).length;
  await companyAudit(ctx, actor, 'import', ctx.companyId, { created, updated, errors: errors.length });
  if (created + updated > 0 && moderation.status === 'pending') {
    await notifyAdmin(`📥 Импорт товаров: ${ctx.owner.company!.name}\nНовых: ${created}, обновлено: ${updated}\nПроверить: ${SITE_URL} → Личный кабинет → Модерация`);
  }
  res.json({ success: true, created, updated, errors, moderation: moderation.status, noPhoto });
}));

const csvCell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(', ') : v === undefined || v === null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const EXPORT_COLUMNS = ['sku', 'title', 'category', 'brand', 'model', 'generation', 'partNumber', 'crossNumbers', 'manufacturer', 'condition', 'priceKgs', 'oldPriceKgs', 'stockCount', 'warehouseId', 'description', 'images', 'listingStatus', 'moderation', 'views'];

app.get('/api/company/export', requireCompany('export'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const parts = await companyParts(ctx.companyId);
  const lines = [EXPORT_COLUMNS.join(';')].concat(
    parts.map((p: any) =>
      EXPORT_COLUMNS.map((c) => csvCell(c === 'moderation' ? p.moderation?.status : c === 'listingStatus' ? p.listingStatus || 'active' : p[c])).join(';')
    )
  );
  await companyAudit(ctx, (req as any).user, 'export', ctx.companyId, { count: parts.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kgzone-catalog-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
}));

// --- Orders ---

const COMPANY_ORDER_STATUSES = ['Новый', 'В обработке', 'Готов к выдаче', 'Выполнен', 'Отменен'];

async function companyOrders(companyId: string) {
  const ids = new Set((await companyParts(companyId)).map((p: any) => p.id));
  return (await listRecords<OrderRecord>('orders')).filter((o) => ids.has(o.partId));
}

app.get('/api/company/orders', requireCompany('orders.view'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  res.json({ success: true, orders: await companyOrders(ctx.companyId), statuses: COMPANY_ORDER_STATUSES });
}));

app.patch('/api/company/orders/:id', requireCompany('orders'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const status = COMPANY_ORDER_STATUSES.includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ success: false, error: 'Неверный статус' });
  const order = (await companyOrders(ctx.companyId)).find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Заказ не найден' });
  await updateRecord<OrderRecord>('orders', order.id, { status });
  // A completed order takes the item off the stock
  if (status === 'Выполнен' && order.status !== 'Выполнен') {
    const p: any = await getRecord('parts', order.partId);
    if (p && p.stockCount > 0) {
      const count = p.stockCount - 1;
      await updateRecord('parts', p.id, { stockCount: count, inStock: count > 0, stockStatus: count > 1 ? 'В наличии' : count === 1 ? 'Осталось мало' : 'Нет в наличии' });
    }
  }
  await companyAudit(ctx, (req as any).user, 'order-status', order.id, { status, orderNumber: order.orderNumber });
  res.json({ success: true });
}));

// --- Statistics & log ---

app.get('/api/company/stats', requireCompany(), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  const parts = await companyParts(ctx.companyId);
  const orders = ctx.can('orders.view') ? await companyOrders(ctx.companyId) : [];
  const views = parts.reduce((n: number, p: any) => n + (p.views || 0), 0);
  const contacts = parts.reduce((n: number, p: any) => n + (p.contactsCount || 0), 0);
  const live = parts.filter((p: any) => isLive(p));
  res.json({
    success: true,
    listings: {
      total: parts.length,
      active: live.length,
      pending: parts.filter((p: any) => p.moderation?.status === 'pending').length,
      rejected: parts.filter((p: any) => p.moderation?.status === 'rejected').length,
      archived: parts.filter((p: any) => p.listingStatus === 'inactive').length,
      sold: parts.filter((p: any) => p.listingStatus === 'sold').length,
      outOfStock: live.filter((p: any) => !p.stockCount).length,
    },
    views,
    contacts,
    conversion: views ? Math.round((contacts / views) * 1000) / 10 : 0,
    orders: ctx.can('orders.view')
      ? {
          total: orders.length,
          open: orders.filter((o) => !['Выполнен', 'Отменен'].includes(o.status)).length,
          completed: orders.filter((o) => o.status === 'Выполнен').length,
          revenueKgs: ctx.can('finance') ? orders.filter((o) => o.status === 'Выполнен').reduce((n, o) => n + (o.priceKgs || 0), 0) : undefined,
        }
      : undefined,
    top: [...parts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p: any) => ({ id: p.id, title: p.title, views: p.views || 0, contacts: p.contactsCount || 0 })),
  });
}));

app.get('/api/company/audit', requireCompany('audit'), asyncRoute(async (req: Request, res: Response) => {
  const ctx: CompanyContext = (req as any).company;
  res.json({ success: true, entries: (await listRecords('audit')).filter((a: any) => a.companyId === ctx.companyId).slice(0, 300) });
}));

// ---------------------------------------------------------------------------
// Search engine pages: every important address returns real HTML (title, description,
// content, structured data) before the React app takes over in the browser.
// Only real, approved listings from the database are indexed — never demo listings.
// Keep SEO_CATEGORIES slugs and seoSlugify() in sync with src/seo/routes.ts.
// ---------------------------------------------------------------------------

const SEO_CATEGORIES: { slug: string; name: string; keywords: string[]; text: string }[] = [
  { slug: 'dvigatel', name: 'Двигатель', keywords: ['двигатель', 'гбц', 'поршн', 'турбин', 'грм', 'помпа'], text: 'Контрактные и новые двигатели, ГБЦ, поршни, коленвалы, турбины, ремни и цепи ГРМ.' },
  { slug: 'transmissiya', name: 'Трансмиссия', keywords: ['трансмисс', 'акпп', 'мкпп', 'вариатор', 'сцеплен', 'привод', 'шрус', 'раздат'], text: 'АКПП, МКПП, вариаторы, сцепление, приводы, ШРУСы и раздаточные коробки.' },
  { slug: 'podveska', name: 'Подвеска и ходовая', keywords: ['ходов', 'подвеск', 'амортизатор', 'стойк', 'рычаг', 'ступиц', 'пневмобаллон', 'сайлентблок'], text: 'Амортизаторы, стойки, рычаги, ступицы, подшипники, пружины и пневмобаллоны.' },
  { slug: 'tormoza', name: 'Тормозная система', keywords: ['тормоз', 'колодк', 'суппорт', 'abs'], text: 'Тормозные колодки, диски, суппорты, шланги и блоки ABS.' },
  { slug: 'kuzov', name: 'Кузовные детали', keywords: ['кузов', 'бампер', 'капот', 'крыло', 'двер', 'зеркал'], text: 'Бамперы, капоты, крылья, двери, крышки багажника и зеркала.' },
  { slug: 'optika', name: 'Оптика и фары', keywords: ['оптика', 'фара', 'фонар', 'поворотник', 'противотуман'], text: 'Фары LED и ксенон, задние фонари, противотуманные фары и поворотники.' },
  { slug: 'elektrika', name: 'Электрика', keywords: ['электрик', 'генератор', 'стартер', 'датчик', 'эбу', 'блок управления', 'катушк'], text: 'Генераторы, стартеры, датчики, блоки управления (ЭБУ) и катушки зажигания.' },
  { slug: 'ohlazhdenie', name: 'Система охлаждения', keywords: ['охлажден', 'радиатор', 'вентилятор', 'термостат'], text: 'Радиаторы, вентиляторы, помпы, термостаты и патрубки.' },
  { slug: 'otoplenie-kondicioner', name: 'Отопление и кондиционер', keywords: ['отоплен', 'кондиционер', 'печк', 'компрессор кондиционера'], text: 'Радиаторы печки, компрессоры кондиционера, конденсеры и моторы печки.' },
  { slug: 'toplivnaya-sistema', name: 'Топливная система', keywords: ['топлив', 'форсунк', 'бензонасос', 'дроссел'], text: 'Форсунки, топливные насосы, рампы, баки и топливные фильтры.' },
  { slug: 'rashodniki-to', name: 'Расходники и ТО', keywords: ['масл', 'фильтр', 'свеч', 'ремн', 'расходник'], text: 'Масла, фильтры, свечи зажигания, ремни и всё для технического обслуживания.' },
  { slug: 'kolesa-diski', name: 'Колёса, шины и диски', keywords: ['шин', 'диск', 'колес', 'резин'], text: 'Шины, литые и штампованные диски, датчики давления.' },
  { slug: 'salon', name: 'Салон и интерьер', keywords: ['салон', 'сиден', 'руль', 'торпедо', 'airbag', 'обшивк'], text: 'Сиденья, рули, торпедо, подушки безопасности и обшивки.' },
  { slug: 'vyhlop', name: 'Выхлопная система', keywords: ['выхлоп', 'глушител', 'катализатор', 'резонатор'], text: 'Глушители, катализаторы, резонаторы и лямбда-зонды.' },
  { slug: 'tyuning', name: 'Тюнинг и доп. оборудование', keywords: ['тюнинг', 'обвес', 'спойлер', 'фаркоп', 'магнитол', 'регистратор'], text: 'Обвесы, спойлеры, фаркопы, магнитолы, видеорегистраторы и сигнализации.' },
];

const SEO_BRANDS = [
  'Toyota', 'Lexus', 'Honda', 'Nissan', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Hyundai', 'Kia', 'Genesis', 'Daewoo', 'Chevrolet',
  'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Porsche', 'Land Rover', 'Volvo', 'Ford', 'Opel', 'Renault', 'Lada',
  'BYD', 'Geely', 'Chery', 'Haval', 'Changan', 'Zeekr', 'Li Auto', 'Tank', 'Tesla',
];

const SEO_TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ң: 'n', ө: 'o', ү: 'u',
};
const seoSlugify = (text: string) =>
  text.toLowerCase().split('').map((ch) => SEO_TRANSLIT[ch] ?? ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const jsonLd = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const absUrl = (p: string) => (p.startsWith('http') ? p : `${SITE_URL}${p}`);
const partUrl = (p: any) => `/zapchast/${encodeURIComponent(p.id)}/${seoSlugify(p.title)}`;
const carUrl = (c: any) => `/avto/${encodeURIComponent(c.id)}/${seoSlugify(c.title)}`;
const fmtKgs = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;

const partInSeoCategory = (p: any, cat: (typeof SEO_CATEGORIES)[number]) => {
  const text = `${p.category} ${p.subcategory || ''} ${p.title}`.toLowerCase();
  return cat.keywords.some((k) => text.includes(k));
};
const partFitsSeoBrand = (p: any, brand: string) =>
  p.brand === brand || (p.compatibility || []).some((c: any) => c.brand === brand);

// Re-read after a rebuild (the file's modification time changes), otherwise served from memory
let indexTemplate: { mtime: number; html: string } | null = null;
function loadIndexTemplate() {
  const file = path.resolve(__dirname, 'public', 'index.html');
  if (!fs.existsSync(file)) return '';
  const mtime = fs.statSync(file).mtimeMs;
  if (!indexTemplate || indexTemplate.mtime !== mtime) indexTemplate = { mtime, html: fs.readFileSync(file, 'utf8') };
  return indexTemplate.html;
}

interface SeoPage {
  title: string;
  description: string;
  path: string;
  image?: string;
  body: string;
  structured: unknown[];
  status?: number;
  noindex?: boolean;
}

function renderSeo(page: SeoPage): string | null {
  let html = loadIndexTemplate();
  if (!html) return null;
  const url = absUrl(page.path);
  const image = page.image ? absUrl(page.image) : `${SITE_URL}/cars/zeekr-001.jpg`;
  const head = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    page.noindex ? '<meta name="robots" content="noindex">' : '',
    ...page.structured.map(jsonLd),
  ].join('\n    ');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(page.description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    // Visible content for crawlers and for the first moment before the app starts
    .replace('<div id="root"></div>', `<div id="root"><div style="max-width:1100px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;color:#e5e5e5;background:#0a0a0a">${page.body}</div></div>`);
  return html;
}

const breadcrumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absUrl(p) })),
});
const crumbsHtml = (items: [string, string][]) =>
  `<nav style="font-size:13px;margin-bottom:12px">${items.map(([n, p]) => `<a href="${esc(p)}" style="color:#f87171">${esc(n)}</a>`).join(' › ')}</nav>`;
const linkList = (links: [string, string][]) =>
  `<ul style="display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0">${links.map(([n, p]) => `<li><a href="${esc(p)}" style="color:#fbbf24">${esc(n)}</a></li>`).join('')}</ul>`;

const partsListHtml = (parts: any[]) =>
  parts.length
    ? `<ul style="list-style:none;padding:0">${parts.map((p) => `<li style="margin:8px 0"><a href="${esc(partUrl(p))}" style="color:#fff;font-weight:700">${esc(p.title)}</a> — ${esc(fmtKgs(p.priceKgs))}, OEM ${esc(p.partNumber)}${p.storeCity ? `, ${esc(p.storeCity)}` : ''}</li>`).join('')}</ul>`
    : '<p>Сейчас объявлений нет. Загляните позже или подайте своё объявление — это бесплатно.</p>';

const itemList = (parts: any[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: parts.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(partUrl(p)), name: p.title })),
});

const conditionSchema = (c: string) =>
  /восстановл/i.test(c) ? 'https://schema.org/RefurbishedCondition' : /б\/у|контракт|разбор/i.test(c) ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition';

// Page requests do not pass the /api middleware, so make sure the store is ready here
const seoStoreReady = () =>
  initStore({ orders: seedOrders, bookings: seedBookings, reviews: seedReviews, parts: [], cars: [], reports: [], users: [], audit: [], conversations: [], sellerReviews: [], memberships: [], partRequests: [] });

const liveParts = async () => (await listRecords('parts')).filter(isPublicPart);
const liveCars = async () => (await listRecords('cars')).filter(isLive);

const CATEGORY_LINKS = (): [string, string][] => SEO_CATEGORIES.map((c) => [c.name, `/zapchasti/${c.slug}`]);
const BRAND_LINKS = (): [string, string][] => SEO_BRANDS.map((b) => [`Запчасти ${b}`, `/zapchasti/marka/${seoSlugify(b)}`]);

async function seoPageFor(pathname: string): Promise<SeoPage | null> {
  await seoStoreReady();
  const p = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  let m: RegExpMatchArray | null;

  if (p === '/zapchasti') {
    const parts = (await liveParts()).slice(0, 60);
    return {
      title: 'Автозапчасти в Кыргызстане — новые, б/у и контрактные | KGzone',
      description: 'Каталог автозапчастей в Бишкеке, Оше и по всему Кыргызстану: поиск по марке, модели, OEM-номеру и VIN. Частные продавцы, магазины и разборки.',
      path: '/zapchasti',
      body: `${crumbsHtml([['KGzone', '/'], ['Автозапчасти', '/zapchasti']])}<h1>Автозапчасти в Кыргызстане</h1><p>Новые, б/у, контрактные и восстановленные запчасти от частных продавцов, магазинов и авторазборок Бишкека, Оша и всех областей.</p><h2>Категории</h2>${linkList(CATEGORY_LINKS())}<h2>Запчасти по маркам</h2>${linkList(BRAND_LINKS())}<h2>Свежие объявления</h2>${partsListHtml(parts)}`,
      structured: [breadcrumbs([['KGzone', '/'], ['Автозапчасти', '/zapchasti']]), itemList(parts)],
    };
  }

  if ((m = p.match(/^\/zapchasti\/marka\/([^/]+)$/))) {
    const brand = SEO_BRANDS.find((b) => seoSlugify(b) === m![1]);
    if (!brand) return null;
    const parts = (await liveParts()).filter((x: any) => partFitsSeoBrand(x, brand));
    const path_ = `/zapchasti/marka/${seoSlugify(brand)}`;
    const crumbs: [string, string][] = [['KGzone', '/'], ['Автозапчасти', '/zapchasti'], [`Запчасти ${brand}`, path_]];
    return {
      title: `Запчасти ${brand} в Бишкеке и Кыргызстане — купить новые и б/у | KGzone`,
      description: `Автозапчасти для ${brand}: двигатели, ходовая, кузов, оптика, расходники. Объявления продавцов и магазинов Кыргызстана с ценами в сомах.`,
      path: path_,
      body: `${crumbsHtml(crumbs)}<h1>Запчасти ${esc(brand)}</h1><p>Объявлений: ${parts.length}. Подберите деталь по модели, поколению или OEM-номеру.</p><h2>Категории</h2>${linkList(CATEGORY_LINKS())}<h2>Объявления</h2>${partsListHtml(parts.slice(0, 100))}`,
      structured: [breadcrumbs(crumbs), itemList(parts)],
    };
  }

  if ((m = p.match(/^\/zapchasti\/([^/]+)$/))) {
    const cat = SEO_CATEGORIES.find((c) => c.slug === m![1]);
    if (!cat) return null;
    const parts = (await liveParts()).filter((x: any) => partInSeoCategory(x, cat));
    const crumbs: [string, string][] = [['KGzone', '/'], ['Автозапчасти', '/zapchasti'], [cat.name, `/zapchasti/${cat.slug}`]];
    return {
      title: `${cat.name} — запчасти в Бишкеке и Кыргызстане | KGzone`,
      description: `${cat.text} Новые, б/у и контрактные запчасти от продавцов Кыргызстана.`,
      path: `/zapchasti/${cat.slug}`,
      body: `${crumbsHtml(crumbs)}<h1>${esc(cat.name)}</h1><p>${esc(cat.text)}</p><h2>Объявления</h2>${partsListHtml(parts.slice(0, 100))}<h2>Другие категории</h2>${linkList(CATEGORY_LINKS().filter(([, href]) => href !== `/zapchasti/${cat.slug}`))}`,
      structured: [breadcrumbs(crumbs), itemList(parts)],
    };
  }

  if ((m = p.match(/^\/zapchast\/([^/]+)(?:\/[^/]*)?$/))) {
    const part: any = await getRecord('parts', m[1]);
    if (!part || !isLive(part)) {
      return { title: 'Объявление не найдено | KGzone', description: 'Объявление снято с публикации или удалено.', path: p, body: '<h1>Объявление не найдено</h1><p><a href="/zapchasti" style="color:#fbbf24">Все автозапчасти</a></p>', structured: [], status: 404, noindex: true };
    }
    const crumbs: [string, string][] = [['KGzone', '/'], ['Автозапчасти', '/zapchasti'], [part.title, partUrl(part)]];
    const fits = [part.brand, part.model, part.generation].filter(Boolean).join(' ');
    const seller = part.storeName || part.companyName || 'Частный продавец';
    return {
      title: `${part.title} — ${fmtKgs(part.priceKgs)} | KGzone`,
      description: `${part.title}. OEM ${part.partNumber}. ${part.condition}. Для ${fits}. Цена ${fmtKgs(part.priceKgs)}${part.storeCity ? `, ${part.storeCity}` : ''}.`.slice(0, 300),
      path: partUrl(part),
      image: part.image,
      body: `${crumbsHtml(crumbs)}<h1>${esc(part.title)}</h1>${part.image ? `<img src="${esc(part.image)}" alt="${esc(part.title)}" style="max-width:100%;width:480px;border-radius:12px">` : ''}<p><b>Цена:</b> ${esc(fmtKgs(part.priceKgs))}</p><p><b>OEM:</b> ${esc(part.partNumber)}${part.crossNumbers?.length ? ` · <b>Кросс-номера:</b> ${esc(part.crossNumbers.join(', '))}` : ''}</p><p><b>Состояние:</b> ${esc(part.condition)} · <b>Подходит:</b> ${esc(fits || 'Не указано')}</p><p><b>Продавец:</b> ${esc(seller)}${part.storeCity ? `, ${esc(part.storeCity)}` : ''}</p>${part.description ? `<p>${esc(part.description)}</p>` : ''}`,
      structured: [
        breadcrumbs(crumbs),
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: part.title,
          image: part.images?.length ? part.images.map(absUrl) : part.image ? [absUrl(part.image)] : undefined,
          description: part.description || `${part.title}, OEM ${part.partNumber}`,
          sku: part.sku || part.partNumber,
          mpn: part.partNumber,
          ...(part.manufacturer ? { brand: { '@type': 'Brand', name: part.manufacturer } } : {}),
          offers: {
            '@type': 'Offer',
            url: absUrl(partUrl(part)),
            price: part.priceKgs,
            priceCurrency: 'KGS',
            availability: part.stockCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/BackOrder',
            itemCondition: conditionSchema(part.condition),
            seller: { '@type': part.sellerType === 'legal' ? 'Organization' : 'Person', name: seller },
          },
        },
      ],
    };
  }

  if (p === '/avto') {
    const cars = (await liveCars()).slice(0, 60);
    return {
      title: 'Продажа автомобилей в Кыргызстане | KGzone',
      description: 'Объявления о продаже автомобилей в Бишкеке, Оше и по всему Кыргызстану. Цены, пробег, растаможка.',
      path: '/avto',
      body: `${crumbsHtml([['KGzone', '/'], ['Автомобили', '/avto']])}<h1>Продажа автомобилей в Кыргызстане</h1>${cars.length ? `<ul style="list-style:none;padding:0">${cars.map((c: any) => `<li style="margin:8px 0"><a href="${esc(carUrl(c))}" style="color:#fff;font-weight:700">${esc(c.title)}</a> — $${esc(Number(c.priceUsd).toLocaleString('ru-RU'))}, ${esc(c.city)}, ${esc(Number(c.mileageKm).toLocaleString('ru-RU'))} км</li>`).join('')}</ul>` : '<p>Сейчас объявлений нет.</p>'}`,
      structured: [breadcrumbs([['KGzone', '/'], ['Автомобили', '/avto']])],
    };
  }

  if ((m = p.match(/^\/avto\/([^/]+)(?:\/[^/]*)?$/))) {
    const car: any = await getRecord('cars', m[1]);
    if (!car || !isLive(car)) {
      return { title: 'Объявление не найдено | KGzone', description: 'Объявление снято с публикации или удалено.', path: p, body: '<h1>Объявление не найдено</h1><p><a href="/avto" style="color:#fbbf24">Все автомобили</a></p>', structured: [], status: 404, noindex: true };
    }
    const crumbs: [string, string][] = [['KGzone', '/'], ['Автомобили', '/avto'], [car.title, carUrl(car)]];
    return {
      title: `${car.title} — $${Number(car.priceUsd).toLocaleString('ru-RU')}, ${car.city} | KGzone`,
      description: `${car.title}: ${car.year} г., пробег ${Number(car.mileageKm).toLocaleString('ru-RU')} км, ${car.transmission}, ${car.fuelType}, ${car.customs}. Цена $${car.priceUsd}, ${car.city}.`,
      path: carUrl(car),
      image: car.image,
      body: `${crumbsHtml(crumbs)}<h1>${esc(car.title)}</h1>${car.image ? `<img src="${esc(car.image)}" alt="${esc(car.title)}" style="max-width:100%;width:560px;border-radius:12px">` : ''}<p><b>Цена:</b> $${esc(Number(car.priceUsd).toLocaleString('ru-RU'))}</p><p>${esc(car.year)} г. · ${esc(Number(car.mileageKm).toLocaleString('ru-RU'))} км · ${esc(car.transmission)} · ${esc(car.fuelType)} · ${esc(car.drive)} · ${esc(car.customs)}</p><p><b>Город:</b> ${esc(car.city)}</p>${car.description && car.description !== '—' ? `<p>${esc(car.description)}</p>` : ''}`,
      structured: [
        breadcrumbs(crumbs),
        {
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: car.title,
          brand: { '@type': 'Brand', name: car.brand },
          model: car.model,
          vehicleModelDate: String(car.year),
          mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.mileageKm, unitCode: 'KMT' },
          fuelType: car.fuelType,
          vehicleTransmission: car.transmission,
          color: car.color || undefined,
          image: car.photos?.length ? car.photos.map(absUrl) : car.image ? [absUrl(car.image)] : undefined,
          offers: { '@type': 'Offer', price: car.priceUsd, priceCurrency: 'USD', url: absUrl(carUrl(car)), availability: 'https://schema.org/InStock' },
        },
      ],
    };
  }

  const STATIC: Record<string, [string, string, string]> = {
    '/sto': ['Автосервис — раздел в разработке | KGzone', 'Раздел автосервисов KGzone готовится к запуску. Когда к сайту подключатся сервисы-партнёры, здесь появится запись.', 'Автосервис'],
    '/pravila': ['Пользовательское соглашение | KGzone', 'Правила использования сайта KGzone: размещение объявлений, модерация, безопасность сделок и ответственность сторон.', 'Пользовательское соглашение'],
    '/konfidencialnost': ['Политика конфиденциальности | KGzone', 'Какие персональные данные собирает KGzone, как они используются, хранятся и удаляются.', 'Политика конфиденциальности'],
    '/faq': ['Частые вопросы — покупка авто и запчастей в Кыргызстане | KGzone', 'Ответы на вопросы о покупке и продаже авто и запчастей, растаможке и проверке автомобилей в КР.', 'Частые вопросы'],
    '/akcii': ['Акции и скидки на автозапчасти и сервис | KGzone', 'Актуальные акции и скидки на автозапчасти и обслуживание автомобилей в Кыргызстане.', 'Акции и скидки'],
    '/otzyvy': ['Отзывы автовладельцев Кыргызстана | KGzone', 'Отзывы владельцев автомобилей о машинах, запчастях и сервисе в Кыргызстане.', 'Отзывы автовладельцев'],
    '/novosti': ['Автоновости Кыргызстана | KGzone', 'Новости авторынка Кыргызстана: законы, растаможка, цены и тенденции.', 'Автоновости'],
  };
  if (STATIC[p]) {
    const [title, description, h1] = STATIC[p];
    return { title, description, path: p, body: `${crumbsHtml([['KGzone', '/'], [h1, p]])}<h1>${esc(h1)}</h1><p>${esc(description)}</p>`, structured: [breadcrumbs([['KGzone', '/'], [h1, p]])] };
  }
  if (p === '/kabinet') {
    return { title: 'Личный кабинет | KGzone', description: 'Вход и регистрация на KGzone.', path: p, body: '<h1>Личный кабинет</h1>', structured: [], noindex: true };
  }
  return null;
}

app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /kabinet', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
  );
});

app.get('/sitemap.xml', asyncRoute(async (_req: Request, res: Response) => {
  await seoStoreReady();
  const [parts, cars] = await Promise.all([liveParts(), liveCars()]);
  const day = (iso?: string) => (iso ? iso.slice(0, 10) : undefined);
  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/zapchasti', priority: '0.9' },
    { loc: '/avto', priority: '0.8' },
    ...SEO_CATEGORIES.map((c) => ({ loc: `/zapchasti/${c.slug}`, priority: '0.7' })),
    ...SEO_BRANDS.map((b) => ({ loc: `/zapchasti/marka/${seoSlugify(b)}`, priority: '0.7' })),
    ...['/sto', '/akcii', '/faq', '/otzyvy', '/novosti', '/pravila', '/konfidencialnost'].map((loc) => ({ loc, priority: '0.5' })),
    ...parts.map((p: any) => ({ loc: partUrl(p), lastmod: day(p.updatedAt || p.raisedAt || p.createdAt), priority: '0.6' })),
    ...cars.map((c: any) => ({ loc: carUrl(c), lastmod: day(c.updatedAt || c.raisedAt || c.createdAt), priority: '0.6' })),
  ];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(absUrl(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n';
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.type('application/xml').send(xml);
}));

// Page requests (not files, not API): send prepared HTML when we have it
app.get(/^\/(zapchasti|zapchast|avto|sto|faq|akcii|otzyvy|novosti|kabinet|pravila|konfidencialnost)(\/.*)?$/, (req: Request, res: Response, next: () => void) => {
  if (!isProd) return next();
  seoPageFor(req.path)
    .then((page) => {
      const html = page && renderSeo(page);
      if (!html) return next();
      res.status(page!.status || 200);
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
      res.type('html').send(html);
    })
    .catch((err) => { console.error('[SEO] render failed:', err); next(); });
});

// ---------------------------------------------------------------------------
// Parts catalogs (VIN / frame number lookup, OEM numbers, cross references).
// One interface, several providers. Choose with CATALOG_PROVIDER=laximo|tecdoc and set that
// provider's credentials (see catalogProviders below). Without them only the built-in
// "local" features work: cross search across KGzone listings by OEM and cross numbers.
// Paid lookups are cached (Redis when available) and rate limited per visitor.
// ---------------------------------------------------------------------------

interface CatalogVehicle {
  /** Provider-specific reference needed for the next calls (opaque to the browser) */
  ref: string;
  brand: string;
  model: string;
  modification?: string;
  year?: string;
  engine?: string;
  bodyCode?: string;
  market?: string;
}
interface CatalogGroup { id: string; name: string; parentId?: string }
interface CatalogPart { oem: string; name: string; quantity?: string; note?: string; brand?: string }
interface CatalogCross { brand: string; number: string; name?: string }

interface CatalogProvider {
  id: 'laximo' | 'tecdoc';
  name: string;
  /** true once the credentials are present */
  configured: boolean;
  features: { vin: boolean; frame: boolean; groups: boolean; crosses: boolean };
  findVehicles(query: string): Promise<CatalogVehicle[]>;
  listGroups(vehicleRef: string): Promise<CatalogGroup[]>;
  listParts(vehicleRef: string, groupId: string): Promise<CatalogPart[]>;
  findCrosses(oem: string, brand?: string): Promise<CatalogCross[]>;
}

class CatalogNotReady extends Error {}

const notReady = (provider: string) => () => {
  // Filled in after access is granted: see the provider's API documentation and the
  // method contract above. Until then the site reports "catalog not connected".
  throw new CatalogNotReady(`${provider}: модуль подключения ещё не дописан — нужен доступ к API и документации`);
};

// Laximo (laximo.ru): original catalogs, VIN and Japanese frame numbers.
// Env: LAXIMO_LOGIN, LAXIMO_KEY. Typical flow: find vehicle by VIN/frame -> categories ->
// units (assembly diagrams) -> details (OEM numbers); Aftermarket service for crosses.
const laximoProvider: CatalogProvider = {
  id: 'laximo',
  name: 'Laximo',
  configured: Boolean(process.env.LAXIMO_LOGIN && process.env.LAXIMO_KEY),
  features: { vin: true, frame: true, groups: true, crosses: true },
  findVehicles: notReady('Laximo'),
  listGroups: notReady('Laximo'),
  listParts: notReady('Laximo'),
  findCrosses: notReady('Laximo'),
};

// TecDoc (TecAlliance): aftermarket catalog and cross references.
// Env: TECDOC_API_KEY, TECDOC_PROVIDER_ID.
const tecdocProvider: CatalogProvider = {
  id: 'tecdoc',
  name: 'TecDoc',
  configured: Boolean(process.env.TECDOC_API_KEY && process.env.TECDOC_PROVIDER_ID),
  features: { vin: true, frame: false, groups: true, crosses: true },
  findVehicles: notReady('TecDoc'),
  listGroups: notReady('TecDoc'),
  listParts: notReady('TecDoc'),
  findCrosses: notReady('TecDoc'),
};

const catalogProviders: Record<string, CatalogProvider> = { laximo: laximoProvider, tecdoc: tecdocProvider };
const activeCatalog = (): CatalogProvider | null => {
  const p = catalogProviders[(process.env.CATALOG_PROVIDER || '').toLowerCase()];
  return p && p.configured ? p : null;
};

// Cache: Redis (shared between server instances) or memory
const memCache = new Map<string, { at: number; value: unknown }>();
const CATALOG_TTL = 7 * 86_400; // seconds; catalogs change rarely and lookups are paid
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const k = `kgzone:catalog:${createHmac('sha1', 'kgz').update(key).digest('hex')}`;
  if (redis) {
    const hit = await redis.get<T>(k);
    if (hit !== null && hit !== undefined) return hit;
  } else {
    const hit = memCache.get(k);
    if (hit && Date.now() - hit.at < CATALOG_TTL * 1000) return hit.value as T;
  }
  const value = await fn();
  if (redis) await redis.set(k, value as any, { ex: CATALOG_TTL });
  else { memCache.set(k, { at: Date.now(), value }); if (memCache.size > 2000) memCache.delete(memCache.keys().next().value!); }
  return value;
}

const normOem = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Runs a provider call and turns "not ready" / failures into clear answers
async function catalogCall<T>(res: Response, fn: (p: CatalogProvider) => Promise<T>) {
  const provider = activeCatalog();
  if (!provider) return res.status(503).json({ success: false, configured: false, error: 'Каталог запчастей (Laximo / TecDoc) пока не подключён' });
  try {
    return res.json({ success: true, provider: provider.name, result: await fn(provider) });
  } catch (err: any) {
    if (err instanceof CatalogNotReady) return res.status(503).json({ success: false, configured: false, error: err.message });
    console.error('[catalog]', err);
    return res.status(502).json({ success: false, error: 'Каталог временно не отвечает. Попробуйте позже.' });
  }
}

const catalogLimited = (req: Request, res: Response) => {
  if (tooMany(`catalog:${clientIp(req)}`, 30, 10 * 60_000)) {
    res.status(429).json({ success: false, error: 'Слишком много запросов к каталогу. Подождите несколько минут.' });
    return true;
  }
  return false;
};

app.get('/api/catalog/status', (_req: Request, res: Response) => {
  const p = activeCatalog();
  res.json({
    success: true,
    configured: Boolean(p),
    provider: p?.name || null,
    features: p?.features || { vin: false, frame: false, groups: false, crosses: false },
    available: Object.values(catalogProviders).map((x) => ({ id: x.id, name: x.name, configured: x.configured })),
    selected: (process.env.CATALOG_PROVIDER || '').toLowerCase() || null,
  });
});

// VIN or frame number -> vehicles (several when the number is ambiguous)
// Free VIN decoding by the US NHTSA vPIC database (no key). Good for cars built for the US
// market (many imports to Kyrgyzstan); weaker for Japanese/Chinese domestic models.
const titleCase = (v: string) => v.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
async function vpicDecode(vin: string): Promise<CatalogVehicle[]> {
  const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`vPIC ${r.status}`);
  const row = ((await r.json()) as any)?.Results?.[0];
  if (!row?.Make || !row?.Model) return [];
  const make = String(row.Make).trim();
  const brandName = make.length <= 3 ? make : make === 'MERCEDES-BENZ' ? 'Mercedes-Benz' : titleCase(make);
  const engine = [row.DisplacementL ? `${Number(row.DisplacementL).toFixed(1)} л` : '', row.EngineModel, row.FuelTypePrimary].filter(Boolean).join(' · ');
  return [{
    ref: `vpic:${vin}`,
    brand: brandName,
    model: String(row.Model).trim(),
    modification: [row.Trim, row.DriveType, row.TransmissionStyle].filter(Boolean).join(' · ') || undefined,
    year: row.ModelYear || undefined,
    engine: engine || undefined,
    bodyCode: [row.Series, row.BodyClass].filter(Boolean).join(' · ') || undefined,
    market: row.PlantCountry ? titleCase(String(row.PlantCountry)) : undefined,
  }];
}

app.get('/api/catalog/vehicles', asyncRoute(async (req: Request, res: Response) => {
  if (catalogLimited(req, res)) return;
  const q = String(req.query.q || '').toUpperCase().replace(/\s+/g, '').slice(0, 30);
  if (q.length < 6) return res.status(400).json({ success: false, error: 'Введите VIN (17 символов) или номер кузова' });
  if (activeCatalog()) return catalogCall(res, (p) => cached(`${p.id}:veh:${q}`, () => p.findVehicles(q)));
  // No paid catalog: free decoding for real VINs
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(q)) {
    return res.status(503).json({ success: false, configured: false, error: 'Подбор по номеру кузова через внешний каталог не подключён' });
  }
  try {
    const result = await cached(`vpic:${q}`, () => vpicDecode(q));
    res.json({ success: true, provider: 'NHTSA vPIC', free: true, groups: false, result });
  } catch (err) {
    console.warn('[vPIC]', err);
    res.status(502).json({ success: false, error: 'Бесплатная база VIN временно не отвечает' });
  }
}));

// --- KGzone OEM knowledge base -------------------------------------------------
// Built from sellers' listings: OEM number -> analogues (cross numbers), names and the cars
// a part fits. The more independent sellers state the same link, the more reliable it is.
interface OemKnowledge {
  number: string;
  names: { name: string; count: number }[];
  crosses: { number: string; sellers: number }[];
  fits: { brand: string; model: string; generation?: string; sellers: number }[];
  listings: number;
  sellers: number;
}

let oemIndexCache: { at: number; byNumber: Map<string, any[]> } | null = null;
async function oemIndex() {
  if (oemIndexCache && Date.now() - oemIndexCache.at < 5 * 60_000) return oemIndexCache.byNumber;
  const byNumber = new Map<string, any[]>();
  for (const p of (await listRecords('parts')).filter((x: any) => x.moderation?.status === 'approved')) {
    const nums = new Set([normOem(p.partNumber), ...(p.crossNumbers || []).map(normOem)].filter((n) => n.length >= 4));
    for (const n of nums) {
      if (!byNumber.has(n)) byNumber.set(n, []);
      byNumber.get(n)!.push(p);
    }
  }
  oemIndexCache = { at: Date.now(), byNumber };
  return byNumber;
}

async function oemKnowledge(raw: string): Promise<OemKnowledge | null> {
  const number = normOem(raw);
  if (number.length < 4) return null;
  const list = (await oemIndex()).get(number) || [];
  if (!list.length) return null;
  const sellerOf = (p: any) => p.ownerId || normOem(p.sellerPhone) || p.id;
  const names = new Map<string, number>();
  const crosses = new Map<string, { display: string; sellers: Set<string> }>();
  const fits = new Map<string, { brand: string; model: string; generation?: string; sellers: Set<string> }>();
  for (const p of list) {
    const seller = sellerOf(p);
    names.set(p.title, (names.get(p.title) || 0) + 1);
    for (const n of [p.partNumber, ...(p.crossNumbers || [])]) {
      const k = normOem(n);
      if (!k || k === number) continue;
      if (!crosses.has(k)) crosses.set(k, { display: String(n).toUpperCase(), sellers: new Set() });
      crosses.get(k)!.sellers.add(seller);
    }
    const cars = [{ brand: p.brand, model: p.model, generation: p.generation || p.bodyCode }, ...(p.compatibility || []).map((c: any) => ({ brand: c.brand, model: c.model, generation: c.bodyCode || c.years }))];
    for (const c of cars) {
      if (!c.brand || !c.model) continue;
      const k = `${c.brand}|${c.model}|${c.generation || ''}`.toLowerCase();
      if (!fits.has(k)) fits.set(k, { brand: c.brand, model: c.model, generation: c.generation || undefined, sellers: new Set() });
      fits.get(k)!.sellers.add(seller);
    }
  }
  return {
    number,
    names: [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    crosses: [...crosses.values()].map((c) => ({ number: c.display, sellers: c.sellers.size })).sort((a, b) => b.sellers - a.sellers).slice(0, 30),
    fits: [...fits.values()].map((f) => ({ brand: f.brand, model: f.model, generation: f.generation, sellers: f.sellers.size })).sort((a, b) => b.sellers - a.sellers).slice(0, 30),
    listings: list.length,
    sellers: new Set(list.map(sellerOf)).size,
  };
}

app.get('/api/oem/:number', asyncRoute(async (req: Request, res: Response) => {
  const k = await oemKnowledge(req.params.number);
  res.json({ success: true, found: Boolean(k), knowledge: k });
}));

app.get('/api/catalog/groups', (req: Request, res: Response) => {
  if (catalogLimited(req, res)) return;
  const ref = String(req.query.vehicle || '').slice(0, 500);
  if (!ref) return res.status(400).json({ success: false, error: 'Не выбран автомобиль' });
  catalogCall(res, (p) => cached(`${p.id}:groups:${ref}`, () => p.listGroups(ref)));
});

app.get('/api/catalog/parts', (req: Request, res: Response) => {
  if (catalogLimited(req, res)) return;
  const ref = String(req.query.vehicle || '').slice(0, 500);
  const group = String(req.query.group || '').slice(0, 200);
  if (!ref || !group) return res.status(400).json({ success: false, error: 'Не выбран узел' });
  catalogCall(res, (p) => cached(`${p.id}:parts:${ref}:${group}`, () => p.listParts(ref, group)));
});

// Cross references: KGzone listings with this OEM/cross number (always) + catalog analogues (when connected)
app.get('/api/catalog/crosses', asyncRoute(async (req: Request, res: Response) => {
  const oem = normOem(req.query.oem);
  if (oem.length < 4) return res.status(400).json({ success: false, error: 'Введите OEM-номер' });
  const parts = (await listRecords('parts')).filter(isPublicPart);
  const local = parts
    .filter((p: any) => normOem(p.partNumber) === oem || (p.crossNumbers || []).some((c: string) => normOem(c) === oem))
    .slice(0, 50)
    .map((p: any) => ({ id: p.id, title: p.title, partNumber: p.partNumber, priceKgs: p.priceKgs, city: p.storeCity, image: p.image }));

  let external: CatalogCross[] = [];
  let externalError: string | null = null;
  const provider = activeCatalog();
  if (provider?.features.crosses && !catalogLimited(req, res)) {
    try {
      external = await cached(`${provider.id}:cross:${oem}`, () => provider.findCrosses(oem, String(req.query.brand || '') || undefined));
    } catch (err: any) {
      externalError = err instanceof CatalogNotReady ? err.message : 'Каталог временно не отвечает';
    }
  }
  if (res.headersSent) return;
  // Listings that carry one of the catalog analogues
  const crossSet = new Set(external.map((c) => normOem(c.number)));
  const viaCrosses = crossSet.size
    ? parts.filter((p: any) => crossSet.has(normOem(p.partNumber)) && !local.some((l) => l.id === p.id)).slice(0, 50)
        .map((p: any) => ({ id: p.id, title: p.title, partNumber: p.partNumber, priceKgs: p.priceKgs, city: p.storeCity, image: p.image }))
    : [];
  const knowledge = await oemKnowledge(oem);
  res.json({ success: true, oem, local, viaCrosses, external, knowledge, catalog: provider?.name || null, externalError });
}));

// ---------------------------------------------------------------------------
// "Find me a part" requests from buyers when nothing is listed yet.
// Stored on the site; staff see them in the cabinet (and in Telegram when configured).
// ---------------------------------------------------------------------------

app.post('/api/part-requests', asyncRoute(async (req: Request, res: Response) => {
  if (tooMany(`preq:${clientIp(req)}`, 10, 60 * 60_000)) {
    return res.status(429).json({ success: false, error: 'Слишком много заявок. Попробуйте позже.' });
  }
  const user = await getSessionUser(req);
  const b = req.body || {};
  const part = str(b.part, 160);
  const brand = str(b.brand, 60);
  const model = str(b.model, 80);
  const phone = normalizePhone(b.phone) || (user ? user.phone : '');
  if (!part) return res.status(400).json({ success: false, error: 'Укажите, какая деталь нужна' });
  if (!phone) return res.status(400).json({ success: false, error: 'Укажите телефон, чтобы с вами связались' });
  const record = {
    id: `preq-${randomUUID()}`,
    part,
    brand,
    model,
    generation: str(b.generation, 80),
    vin: str(b.vin, 25).toUpperCase(),
    comment: str(b.comment, 1000),
    name: str(b.name, 80) || user?.name || '',
    phone,
    userId: user?.id,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  await insertRecord('partRequests', record);
  const sellers = await sellersForBrand(brand);
  await Promise.all(sellers.slice(0, 50).map((id) => notifyUser(id,
    `🔎 Покупатель ищет: ${record.part}${[brand, model, record.generation].filter(Boolean).length ? ` для ${[brand, model, record.generation].filter(Boolean).join(' ')}` : ''}` +
      `${record.vin ? `\nVIN/кузов: ${record.vin}` : ''}${record.comment ? `\n${record.comment}` : ''}\nТелефон покупателя: +${phone}\n\nВсе заявки: ${SITE_URL}/kabinet`)));
  await notifyAdmin(
    `🔎 Заявка на поиск запчасти\n${record.part}${[brand, model, record.generation].filter(Boolean).length ? ` для ${[brand, model, record.generation].filter(Boolean).join(' ')}` : ''}` +
      `${record.vin ? `\nVIN/кузов: ${record.vin}` : ''}${record.comment ? `\n${record.comment}` : ''}\n${record.name ? record.name + ', ' : ''}+${phone}`
  );
  res.status(201).json({ success: true });
}));

// Owners (users or companies) with live parts for this car brand
async function sellersForBrand(brand: string): Promise<string[]> {
  const b = brand.trim().toLowerCase();
  if (!b) return [];
  const ids = new Set<string>();
  for (const p of await listRecords<any>('parts')) {
    if (p.ownerId && isLive(p) && String(p.brand || '').toLowerCase() === b) ids.add(p.ownerId);
  }
  return [...ids];
}

// Sellers see open requests for the brands they sell (last 30 days)
app.get('/api/part-requests/for-me', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const ctx = await companyContext(user);
  const owners = new Set([user.id, ...(ctx ? [ctx.companyId] : [])]);
  const brands = new Set((await listRecords<any>('parts')).filter((p) => owners.has(p.ownerId) && isLive(p)).map((p) => String(p.brand || '').toLowerCase()).filter(Boolean));
  const since = Date.now() - 30 * 86_400_000;
  const requests = (await listRecords<any>('partRequests'))
    .filter((r) => (r.status === 'new' || r.status === 'in_work') && Date.parse(r.createdAt) > since && brands.has(String(r.brand || '').toLowerCase()) && r.userId !== user.id)
    .map(({ userId, ...r }) => r);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, requests, brands: [...brands] });
}));

app.get('/api/admin/part-requests', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, requests: await listRecords('partRequests') });
}));

app.patch('/api/admin/part-requests/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const status = ['new', 'in_work', 'done', 'closed'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ success: false, error: 'Неверный статус' });
  const updated = await updateRecord('partRequests', req.params.id, { status, updatedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ success: false, error: 'Заявка не найдена' });
  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// Telegram linking: the cabinet gives a t.me link with a one-time code; the bot receives
// "/start <code>" through the webhook and remembers the chat for that account.
// ---------------------------------------------------------------------------
const tgWebhookSecret = () => createHmac('sha256', process.env.TELEGRAM_BOT_TOKEN || '').update('kgzone-tg-webhook').digest('hex').slice(0, 48);
let botUsername = '';
async function getBotUsername() {
  if (!botUsername) botUsername = (await tgCall('getMe', {}))?.result?.username || '';
  return botUsername;
}

app.post('/api/telegram/link', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  const username = process.env.TELEGRAM_BOT_TOKEN ? await getBotUsername() : '';
  if (!username) return res.status(503).json({ success: false, error: 'Telegram-бот ещё не подключён администратором сайта' });
  const code = randomBytes(12).toString('base64url');
  await updateRecord<UserRecord>('users', user.id, { telegramLinkCode: code, telegramLinkExpires: Date.now() + 30 * 60_000 });
  res.json({ success: true, url: `https://t.me/${username}?start=${code}` });
}));

app.delete('/api/telegram/link', requireUser, asyncRoute(async (req: Request, res: Response) => {
  const user: UserRecord = (req as any).user;
  if (user.telegramChatId) await tgSend(user.telegramChatId, 'Уведомления KGzone отключены.');
  const updated = await updateRecord<UserRecord>('users', user.id, { telegramChatId: undefined, telegramLinkCode: undefined, telegramLinkExpires: undefined });
  res.json({ success: true, user: publicUser(updated!) });
}));

app.post('/api/telegram/webhook', asyncRoute(async (req: Request, res: Response) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const got = Buffer.from(req.get('x-telegram-bot-api-secret-token') || ''), want = Buffer.from(token ? tgWebhookSecret() : '-');
  if (!token || got.length !== want.length || !timingSafeEqual(got, want)) return res.status(401).end();
  await handleTelegramUpdate(req.body).catch((err) => console.warn('[Telegram] update failed:', err));
  res.json({ ok: true });
}));

async function handleTelegramUpdate(update: any) {
  const msg = update?.message;
  const chatId = msg?.chat?.id ? String(msg.chat.id) : '';
  const text = String(msg?.text || '').trim();
  if (!chatId || msg?.chat?.type !== 'private') return;
  const users = await listRecords<UserRecord>('users');
  const start = text.match(/^\/start\s+([\w-]{8,40})$/);
  if (start) {
    const u = users.find((x) => x.telegramLinkCode === start[1] && (x.telegramLinkExpires || 0) > Date.now());
    if (!u) return void await tgSend(chatId, 'Ссылка устарела. Откройте Личный кабинет на KGzone и нажмите «Подключить Telegram» ещё раз.');
    await updateRecord<UserRecord>('users', u.id, { telegramChatId: chatId, telegramLinkCode: undefined, telegramLinkExpires: undefined });
    return void await tgSend(chatId, `Готово, ${u.name}! Сюда будут приходить новые сообщения покупателей, результаты модерации и заявки на запчасти.\nОтключить: команда /stop`);
  }
  if (text === '/stop') {
    const u = users.find((x) => x.telegramChatId === chatId);
    if (u) await updateRecord<UserRecord>('users', u.id, { telegramChatId: undefined });
    return void await tgSend(chatId, 'Уведомления отключены. Подключить снова можно в Личном кабинете KGzone.');
  }
  await tgSend(chatId, `Это бот уведомлений KGzone. Чтобы подключить его, откройте ${SITE_URL}/kabinet и нажмите «Подключить Telegram».`);
}

app.get('/api/admin/telegram', requireAdminOnly, asyncRoute(async (_req: Request, res: Response) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.json({ success: true, configured: false });
  const info = await tgCall('getWebhookInfo', {});
  const url = info?.result?.url || '';
  res.json({ success: true, configured: true, username: await getBotUsername(), webhookOk: url === `${SITE_URL}/api/telegram/webhook`, lastError: info?.result?.last_error_message || null });
}));

app.post('/api/admin/telegram/setup', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(400).json({ success: false, error: 'Сначала добавьте TELEGRAM_BOT_TOKEN в настройки Vercel' });
  const r = await tgCall('setWebhook', { url: `${SITE_URL}/api/telegram/webhook`, secret_token: tgWebhookSecret(), allowed_updates: ['message'], drop_pending_updates: true });
  if (!r?.ok) return res.status(502).json({ success: false, error: r?.description || 'Telegram не ответил' });
  await audit((req as any).actor, 'telegram.setup', 'bot');
  res.json({ success: true, username: await getBotUsername() });
}));

// Admin loads a seller's price list for them (onboarding shops from the market).
// Rows are the same as the company import; the parts are published right away.
app.post('/api/admin/import', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  const owner = await getRecord<UserRecord>('users', str(req.body?.ownerId, 80));
  if (!owner) return res.status(404).json({ success: false, error: 'Продавец не найден' });
  const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ success: false, error: 'Файл пустой' });
  if (rows.length > 500) return res.status(400).json({ success: false, error: 'Не больше 500 строк за раз. Разделите файл на части.' });
  const existing = (await listRecords<any>('parts')).filter((p) => p.ownerId === owner.id);
  const bySku = new Map(existing.filter((p) => p.sku).map((p) => [p.sku, p]));
  const defaults = {
    sellerType: owner.accountType,
    sellerPhone: '+' + owner.phone,
    storeName: owner.company?.name || owner.name,
    companyName: owner.company?.name,
    inn: owner.company?.inn,
    storeCity: owner.city,
  };
  const now = new Date().toISOString();
  const moderation = { status: 'approved' as PartStatus, submittedAt: now, reviewedAt: now };
  const errors: { row: number; error: string }[] = [];
  let created = 0, updated = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const prev: any = r.sku ? bySku.get(str(r.sku, 60)) : undefined;
    const part: any = sanitizePart({ ...defaults, ...(prev || {}), ...r, sellerType: owner.accountType });
    if (!part.sellerPhone) part.sellerPhone = defaults.sellerPhone;
    const problem = partProblem(part);
    if (problem) { errors.push({ row: i + 2, error: problem }); continue; }
    if (prev) { await updateRecord('parts', prev.id, { ...part, views: prev.views, updatedAt: now }); updated++; }
    else { await insertRecord('parts', { id: `part-${randomUUID()}`, ...part, ownerId: owner.id, createdAt: now, moderation }); created++; }
  }
  const noPhoto = (await listRecords<any>('parts')).filter((p) => p.ownerId === owner.id && !p.images?.length).length;
  await audit((req as any).actor, 'admin.import', owner.id, { created, updated, errors: errors.length });
  if (created + updated) {
    await notifyUser(owner.id, `📥 KGzone загрузил ваш прайс: новых ${created}, обновлено ${updated}.` +
      (noPhoto ? `\n📷 Без фото: ${noPhoto}. Такие товары не видны покупателям — добавьте фото с телефона: Личный кабинет → Мои объявления → «Добавить фото».` : '') +
      `\n${SITE_URL}/kabinet`);
  }
  res.json({ success: true, created, updated, errors, noPhoto });
}));

// VIP placement (paid offline, set by an admin): shown first with a badge until vipUntil
app.post('/api/admin/:kind/:id/vip', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  const kind = listingKind(req.params.kind);
  if (!kind) return res.status(400).json({ success: false, error: 'Неверный тип' });
  const days = Math.round(num(req.body?.days, 0, 365));
  const item: any = await getRecord(kind, req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'Объявление не найдено' });
  const vipUntil = days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined;
  const updated = await updateRecord(kind, item.id, { vipUntil });
  await audit((req as any).actor, 'listing.vip', item.id, { days });
  if (days) await notifyUser(item.ownerId, `⭐ Объявление «${item.title}» получило VIP-размещение на ${days} дн.`);
  res.json({ success: true, item: updated });
}));

// "What is this part?" — a photo goes to Gemini, which names the part and suggests a search
app.post('/api/ai/identify-part', asyncRoute(async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ success: false, error: 'Распознавание по фото сейчас недоступно' });
  if (tooMany(`identify:${clientIp(req)}`, 10, 60 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много фото. Попробуйте через час.' });
  const m = String(req.body?.dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > 4_000_000) return res.status(400).json({ success: false, error: 'Пришлите фото JPEG или PNG до 3 МБ' });
  const prompt = 'Это фото автозапчасти. Определи, что это за деталь. Ответь строго JSON без пояснений: ' +
    '{"name": "название детали по-русски", "category": "одна из: Двигатель, Трансмиссия, Подвеска, Тормозная система, Кузов, Оптика, Электрика, Система охлаждения, Отопление и кондиционер, Топливная система, Масла и фильтры, Шины и диски, Салон, Выхлопная система", ' +
    '"search": "короткий поисковый запрос, 1-3 слова", "confidence": "high|medium|low", "note": "короткая подсказка покупателю, что уточнить у продавца"}. ' +
    'Если на фото не автозапчасть, верни {"name": "", "note": "на фото не видно автозапчасти"}.';
  let text = '';
  for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: `image/${m[1]}`, data: m[2] } }, { text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.2, abortSignal: AbortSignal.timeout(25000) },
      });
      text = r.text || '';
      break;
    } catch (err: any) {
      const timedOut = err?.name === 'AbortError' || err?.name === 'TimeoutError';
      if (!timedOut && ![429, 500, 503, 404].includes(err?.status)) { console.error('[Gemini] identify:', err); break; }
    }
  }
  let result: any = null;
  try { result = JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()); } catch { /* bad answer */ }
  if (!result) return res.status(502).json({ success: false, error: 'Не удалось распознать фото. Попробуйте другое фото или опишите деталь словами.' });
  res.json({
    success: true,
    name: str(result.name, 120),
    category: str(result.category, 60),
    search: str(result.search, 80),
    confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
    note: str(result.note, 300),
  });
}));

// --- Official exchange rates of the National Bank of the Kyrgyz Republic -----------
let ratesCache: { at: number; date: string; rates: Record<string, number> } | null = null;
app.get('/api/rates', asyncRoute(async (_req: Request, res: Response) => {
  if (!ratesCache || Date.now() - ratesCache.at > 3 * 3600_000) {
    try {
      const r = await fetch('https://www.nbkr.kg/XML/daily.xml', { signal: AbortSignal.timeout(8000) });
      const xml = new TextDecoder('windows-1251').decode(await r.arrayBuffer());
      const rates: Record<string, number> = {};
      for (const m of xml.matchAll(/ISOCode="([A-Z]{3})">\s*<Nominal>(\d+)<\/Nominal>\s*<Value>([\d,\.]+)<\/Value>/g)) {
        rates[m[1]] = Number(m[3].replace(',', '.')) / Number(m[2]);
      }
      const date = xml.match(/Date="([\d.]+)"/)?.[1] || '';
      if (rates.USD) ratesCache = { at: Date.now(), date, rates };
    } catch (err) {
      console.warn('[rates] NBKR unavailable:', err);
    }
  }
  if (!ratesCache) return res.status(503).json({ success: false, error: 'Курс НБ КР временно недоступен' });
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800');
  res.json({ success: true, source: 'НБ КР', date: ratesCache.date, rates: ratesCache.rates });
}));

// Complaints about listings (parts or cars) -> admin queue
const REPORT_REASONS = ['Неверная цена', 'Товар уже продан', 'Мошенничество', 'Неверное описание или фото', 'Спам или дубликат', 'Другое'];
const reportHits = new Map<string, number[]>();
const AUTO_HIDE_REPORTS = 3;

app.post('/api/reports', asyncRoute(async (req: Request, res: Response) => {
  const ip = (req.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (reportHits.get(ip) || []).filter((t) => now - t < 60 * 60_000);
  if (recent.length >= 10) return res.status(429).json({ success: false, error: 'Слишком много жалоб. Попробуйте позже.' });
  const body = req.body || {};
  const kind = body.kind === 'car' ? 'car' : 'part';
  const listingId = str(body.listingId, 80);
  const reason = REPORT_REASONS.includes(body.reason) ? body.reason : '';
  if (!listingId || !reason) return res.status(400).json({ success: false, error: 'Выберите причину жалобы' });
  recent.push(now);
  reportHits.set(ip, recent);
  const record = {
    id: `rep-${randomUUID()}`,
    kind,
    listingId,
    listingTitle: str(body.listingTitle, 160),
    reason,
    comment: str(body.comment, 1000),
    contact: str(body.contact, 80),
    status: 'new',
    createdAt: new Date().toISOString(),
    ipHash: createHmac('sha256', SESSION_SECRET).update(ip).digest('hex').slice(0, 16),
  };
  await insertRecord('reports', record);
  // 3 open complaints from different people -> back to moderation (hidden from the site)
  const open = (await listRecords<any>('reports')).filter((r) => r.listingId === listingId && r.status === 'new');
  if (new Set(open.map((r) => r.ipHash || r.id)).size >= AUTO_HIDE_REPORTS) {
    const coll = kind === 'car' ? 'cars' : 'parts';
    const listing: any = await getRecord(coll, listingId);
    if (listing && isLive(listing)) {
      await updateRecord(coll, listingId, { moderation: { ...listing.moderation, status: 'pending', reason: 'Скрыто автоматически после жалоб покупателей' } });
      await notifyAdmin(`🚫 Объявление скрыто после ${open.length} жалоб: ${listing.title}\nПроверьте: ${SITE_URL}/kabinet → Модерация`);
      await notifyUser(listing.ownerId, `⚠️ Ваше объявление «${listing.title}» временно скрыто: на него пожаловались несколько покупателей. Модератор проверит его в ближайшее время.`);
    }
  }
  await notifyAdmin(`⚠️ Жалоба на объявление\n${record.listingTitle} (${record.listingId})\nПричина: ${record.reason}${record.comment ? '\n' + record.comment : ''}`);
  res.status(201).json({ success: true });
}));

app.get('/api/admin/reports', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, reports: await listRecords('reports') });
}));

app.patch('/api/admin/reports/:id', requireAdmin, asyncRoute(async (req: Request, res: Response) => {
  const status = ['new', 'resolved', 'dismissed'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ success: false, error: 'Неверный статус' });
  const updated = await updateRecord('reports', req.params.id, { status, resolvedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ success: false, error: 'Жалоба не найдена' });
  res.json({ success: true, report: updated });
}));

// Real backups: everything in the database as one JSON file.
// Staff download it in the cabinet; a daily Vercel cron sends it to the owner's Telegram.
const ALL_COLLECTIONS: Collection[] = ['orders', 'bookings', 'reviews', 'parts', 'cars', 'reports', 'users', 'audit', 'conversations', 'sellerReviews', 'memberships', 'partRequests'];
async function makeBackup() {
  const collections: Record<string, any[]> = {};
  for (const c of ALL_COLLECTIONS) collections[c] = await listRecords(c);
  return { createdAt: new Date().toISOString(), site: SITE_URL, database: isDatabaseConnected ? 'redis' : 'memory', collections };
}
const backupName = () => `kgzone-backup-${new Date().toISOString().slice(0, 10)}.json`;

app.get('/api/admin/backup', requireAdminOnly, asyncRoute(async (req: Request, res: Response) => {
  const backup = await makeBackup();
  await audit((req as any).actor, 'backup.download', 'database');
  res.setHeader('Content-Disposition', `attachment; filename="${backupName()}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.json(backup);
}));

async function sendBackupToTelegram(): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 0;
  const chats = await staffChatIds();
  const admins = new Set((await listRecords<any>('users')).filter((u) => u.role === 'admin' && u.telegramChatId).map((u) => u.telegramChatId));
  if (process.env.TELEGRAM_CHAT_ID) admins.add(process.env.TELEGRAM_CHAT_ID);
  const targets = chats.filter((c) => admins.has(c)); // the file holds phone numbers: admins only
  const body = JSON.stringify(await makeBackup());
  let sent = 0;
  for (const chatId of targets) {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', `💾 Резервная копия KGzone, ${new Date().toLocaleDateString('ru-RU')}`);
    form.append('document', new Blob([body], { type: 'application/json' }), backupName());
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
      if (r.ok) sent++;
    } catch (err) {
      console.warn('[Backup] Telegram send failed:', err);
    }
  }
  return sent;
}

// Called daily by Vercel Cron (see vercel.json). It returns no data, only sends the file to admins,
// so a stray call is harmless; CRON_SECRET is checked when it is set.
app.get('/api/cron/backup', asyncRoute(async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.get('authorization') !== `Bearer ${secret}`) return res.status(401).json({ success: false });
  if (tooMany('cron:backup', 2, 60 * 60_000)) return res.status(429).json({ success: false });
  const sent = await sendBackupToTelegram();
  res.json({ success: true, sent });
}));

// AI Auto-Consultant Chatbot Route (KGzone Автоэксперт)
app.post('/api/ai/consultant', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Пожалуйста, введите вопрос' });
    }
    if (message.length > 2000) return res.status(400).json({ success: false, error: 'Слишком длинный вопрос' });
    if (tooMany(`ai:${clientIp(req)}`, 30, 60 * 60_000)) return res.status(429).json({ success: false, error: 'Слишком много вопросов. Попробуйте через час.' });

    const systemInstruction = `Ты — дружелюбный и экспертный виртуальный автоконсультант портала KGzone (автобазар Кыргызстана).
Ты превосходно разбираешься в:
1. Автомобильном рынке Кыргызстана (авторынок «РИОМ-АВТО» в Военно-Антоновке по субботам и воскресеньям, авторынок «Жапалак» в Оше, авторынки Каракола и Джалал-Абада).
2. Автозапчастях на крупнейшем рынке автозапчастей Центральной Азии «Кудайберген» (проходы, контейнеры, дубликаты KYB, 555, CTR, Brembo, оригинальные запчасти Toyota/Lexus/Honda/BMW/Zeekr/BYD) и авторынке «Дордой Моторс».
3. Растаможке и таможенных пошлинах ЕАЭС в Кыргызстане (льготная ставка 0% на электромобили, правила утильсбора и оформления в ГРС/Унаа).
4. Проверке авто перед покупкой. Важно: у KGzone НЕТ доступа к базам МВД и ГУ «Унаа» — сайт не показывает аресты, залоги и штрафы. Советуй проверять их официально в ГУ «Унаа» (ЦОН) по госномеру или VIN. На KGzone можно только расшифровать VIN / номер кузова.
5. Популярных в КР моделях (Toyota Camry, Land Cruiser Prado/300, Lexus RX/LX/GX, Honda Fit/CR-V/Stepwgn, Mercedes E-Class/Sprinter, электрокары BYD Song Plus, Zeekr 001, Li Auto L7/L9).
Не выдумывай факты о KGzone: сайт не принимает оплату, не доставляет товары и не имеет своих автосервисов — покупатель договаривается с продавцом напрямую. Если не уверен в цифрах (ставки, цены), так и скажи.
Отвечай вежливо, емко и по существу. Можешь отвечать на русском или кыргызском языке в зависимости от языка пользователя. Давай практические советы для автолюбителей Кыргызстана.`;

    // Construct contents from recent history + new prompt
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.role === 'user' || h.role === 'model') {
          contents.push({
            role: h.role,
            parts: [{ text: String(h.text || h.content || '') }],
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Try the primary model, then fall back to the stable aliases when Gemini is overloaded
    const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
    let response;
    let lastError: any;
    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            // Overloaded models sometimes hang instead of returning 503
            abortSignal: AbortSignal.timeout(20000),
          },
        });
        break;
      } catch (err: any) {
        lastError = err;
        const timedOut = err?.name === 'AbortError' || err?.name === 'TimeoutError';
        // Only overload / rate-limit / unknown-model / timeout errors are worth trying another model for
        if (!timedOut && ![429, 500, 503, 404].includes(err?.status)) throw err;
        console.warn(`[Gemini] ${model} failed (${timedOut ? 'timeout' : err?.status}), trying next model`);
      }
    }
    if (!response) throw lastError;

    const replyText = response.text || 'Извините, не удалось сформировать ответ. Попробуйте еще раз.';

    res.json({
      success: true,
      reply: replyText,
    });
  } catch (error: any) {
    console.error('Gemini Consultant API error:', error);
    // Graceful helpful fallback for offline/preview resilience
    const fallbackAnswer = 'Извините, автоконсультант сейчас недоступен. Попробуйте позже или воспользуйтесь поиском запчастей и калькулятором растаможки на сайте.';
    res.json({
      success: true,
      reply: fallbackAnswer,
      isFallback: true,
    });
  }
});

// Mount Vite or static assets
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'public');
    if (fs.existsSync(distPath)) {
      app.use(
        express.static(distPath, {
          index: false,
          // Build assets have content hashes in their names, so they never change
          setHeaders: (res, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else if (/[\\/](cars|parts)[\\/]/.test(filePath)) {
              // Photos keep their names; a week of caching makes repeat visits instant
              res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
            }
          },
        })
      );
      // A missing build asset (e.g. requested by a page cached before a deploy) must 404,
      // not fall through to index.html — that makes the browser fail to parse it as JS.
      app.use('/assets', (_req: Request, res: Response) => {
        res.status(404).end();
      });
      app.get('*', (_req: Request, res: Response) => {
        // No ETag/Last-Modified: on Vercel every build has the same file mtime, and index.html
        // often keeps the same size, so the browser would get 304 and keep a stale page.
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(path.resolve(distPath, 'index.html'), { etag: false, lastModified: false });
      });
    }
  }

  app.listen(Number(PORT) || 3000, '0.0.0.0', () => {
    console.log(`[KGzone Server] Full-Stack server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

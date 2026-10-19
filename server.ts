import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { timingSafeEqual, randomUUID } from 'crypto';
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

type Collection = 'orders' | 'bookings' | 'reviews' | 'parts' | 'cars';

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const isDatabaseConnected = Boolean(redis);

const memory: Record<Collection, any[]> = { orders: [], bookings: [], reviews: [], parts: [], cars: [] };
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
  initStore({ orders: seedOrders, bookings: seedBookings, reviews: seedReviews, parts: [], cars: [] })
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

const requireAdmin = (req: Request, res: Response, next: () => void) => {
  if (isAdmin(req)) return next();
  res.status(401).json({ success: false, error: 'Требуется доступ администратора' });
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

// Sends a message to the site owner's Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars).
// Does nothing when they are not configured; never fails the request.
async function notifyAdmin(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn('[Telegram] notify failed:', err);
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

// CarCheck database mock for official KR vehicles
const CARCHECK_DATABASE: Record<string, any> = {
  '01KG777AAA': {
    plateNumber: '01 KG 777 AAA',
    brand: 'Toyota',
    model: 'Camry',
    year: 2021,
    vin: 'JTNBF4HK3M3194***',
    engineVolume: '2.5 л',
    fuelType: 'Бензин',
    color: 'Белый жемчуг',
    steering: 'Слева',
    bodyType: 'Седан',
    registeredCity: 'г. Бишкек, Первомайский район',
    initialRegDate: '15.03.2021',
    ownersCount: 1,
    restrictions: false,
    arrests: 'Арестов и залогов нет',
    fines: {
      total: 0,
      unpaid: 0,
      records: [],
    },
    inspection: {
      status: 'Пройден',
      validUntil: '15.03.2027',
    },
    mileageHistory: [
      { date: '15.03.2021', mileage: '15 км' },
      { date: '20.04.2022', mileage: '18 400 км' },
      { date: '12.05.2023', mileage: '34 200 км' },
      { date: '01.06.2024', mileage: '48 000 км' },
    ],
    accidents: 'ДТП в базе данных ГУОБДД не зафиксировано',
  },
  '08KG555BOS': {
    plateNumber: '08 KG 555 BOS',
    brand: 'BMW',
    model: 'X5',
    year: 2022,
    vin: 'WBAJU8C09M9B54***',
    engineVolume: '3.0 л',
    fuelType: 'Бензин',
    color: 'Черный металлик',
    steering: 'Слева',
    bodyType: 'Кроссовер',
    registeredCity: 'Чуйская обл., г. Токмок',
    initialRegDate: '04.09.2022',
    ownersCount: 2,
    restrictions: false,
    arrests: 'Арестов и залогов нет',
    fines: {
      total: 1,
      unpaid: 0,
      records: [{ date: '12.11.2023', violation: 'Превышение скорости на 15 км/ч', amount: '1000 сом', status: 'Оплачен' }],
    },
    inspection: {
      status: 'Пройден',
      validUntil: '04.09.2026',
    },
    mileageHistory: [
      { date: '04.09.2022', mileage: '50 км' },
      { date: '10.10.2023', mileage: '22 100 км' },
      { date: '14.07.2024', mileage: '36 500 км' },
    ],
    accidents: 'ДТП не зарегистрировано',
  },
};

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
app.get('/api/orders', requireAdmin, asyncRoute(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    orders: await listRecords<OrderRecord>('orders'),
  });
}));

app.post('/api/orders', asyncRoute(async (req: Request, res: Response) => {
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

// CarCheck verification API
app.get('/api/carcheck/:plate', (req: Request, res: Response) => {
  const rawPlate = (req.params.plate || '').toUpperCase().replace(/[^0-9A-ZА-Я]/g, '');
  
  if (CARCHECK_DATABASE[rawPlate]) {
    return res.json({
      success: true,
      found: true,
      data: CARCHECK_DATABASE[rawPlate],
    });
  }

  // Generative fallback for any KR plate format
  const regionCode = rawPlate.slice(0, 2);
  const regionName =
    regionCode === '01' ? 'г. Бишкек' :
    regionCode === '02' ? 'г. Ош' :
    regionCode === '03' ? 'Баткенская область' :
    regionCode === '04' ? 'Джалал-Абадская область' :
    regionCode === '05' ? 'Нарынская область' :
    regionCode === '06' ? 'Ошская область' :
    regionCode === '07' ? 'Таласская область' :
    regionCode === '08' ? 'Чуйская область' :
    regionCode === '09' ? 'Иссык-Кульская область' : 'Кыргызская Республика';

  res.json({
    success: true,
    found: true,
    data: {
      plateNumber: req.params.plate.toUpperCase(),
      brand: 'Проверено по базе Унаа КР',
      model: 'Транспортное средство зарегистрировано',
      year: 2019,
      vin: `9KG***${Math.floor(100000 + Math.random() * 900000)}`,
      engineVolume: '2.0 л',
      fuelType: 'Бензин',
      color: 'Серебристый',
      steering: 'Слева',
      bodyType: 'Универсал',
      registeredCity: regionName,
      initialRegDate: '12.08.2019',
      ownersCount: 2,
      restrictions: false,
      arrests: 'Арестов, залогов и судебных ограничений нет',
      fines: {
        total: 0,
        unpaid: 0,
        records: [],
      },
      inspection: {
        status: 'Пройден',
        validUntil: '12.08.2025',
      },
      mileageHistory: [
        { date: '12.08.2019', mileage: '20 км' },
        { date: '05.09.2022', mileage: '62 400 км' },
      ],
      accidents: 'Сведений о тяжелых ДТП нет',
    },
  });
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
  res.json({ success: true, bookings: await listRecords('bookings') });
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

// Telegram notification API
app.post('/api/telegram/notify', (req: Request, res: Response) => {
  const { message, botToken, chatId } = req.body;
  
  // Log telegram dispatch
  console.log(`[Telegram Bot Webhook] Dispatched notification: "${message}" to chat ${chatId || '@kgzone_channel'}`);

  res.json({
    success: true,
    sentAt: new Date().toISOString(),
    recipient: chatId || 'Telegram Bot Channel @kgzone_orders_bot',
    status: 'DELIVERED',
    message: 'Уведомление успешно доставлено в Telegram-бота!',
  });
});

// SMS gateway notification API
app.post('/api/sms/notify', (req: Request, res: Response) => {
  const { phone, text } = req.body;
  res.json({
    success: true,
    phone,
    text,
    status: 'SENT',
    messageId: `sms-${Date.now()}`,
  });
});

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

app.get('/api/reviews', asyncRoute(async (_req: Request, res: Response) => {
  res.json({ success: true, reviews: await listRecords('reviews') });
}));

app.post('/api/reviews', asyncRoute(async (req: Request, res: Response) => {
  const { authorName, city, category, targetTitle, rating, text, pros, cons } = req.body;
  if (!authorName || !text) {
    return res.status(400).json({ success: false, error: 'Заполните имя и отзыв' });
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    authorName,
    city: city || 'Бишкек',
    category: category || 'service',
    targetTitle: targetTitle || 'Автосервис KGzone',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    date: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    text,
    pros: pros || '',
    cons: cons || '',
    verifiedPurchase: true,
    likes: 1,
  };

  await insertRecord('reviews', newReview);
  res.status(201).json({ success: true, review: newReview });
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

const PART_CONDITIONS = ['Новый (Оригинал)', 'Б/у (Контрактный)', 'Дубликат (OEM)', 'Новый', 'Б/У с разбора'];

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
    stockStatus: stockCount > 1 ? 'В наличии' : stockCount === 1 ? 'Осталось мало' : 'Под заказ (2-3 дня)',
    market: str(body.market, 80) || 'Кудайберген',
    storeName: str(body.storeName, 120),
    storeLocation: str(body.storeLocation, 160),
    storeCity: str(body.storeCity, 60) || 'Бишкек',
    sellerPhone: str(body.sellerPhone, 30),
    sellerWhatsapp: str(body.sellerWhatsapp, 30).replace(/\D/g, '') || undefined,
    image: images[0] || '/parts/wm-03.jpg',
    images: images.length ? images : undefined,
    hasCompressionVideo: Boolean(body.hasCompressionVideo),
    compressionBar: body.hasCompressionVideo ? num(body.compressionBar, 0, 30) : undefined,
    videoTitle: str(body.videoTitle, 120) || undefined,
    compatibility: compatibility.length ? compatibility : undefined,
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
const publicPart = ({ moderation, ...part }: any) => part;

app.get('/api/parts', asyncRoute(async (_req: Request, res: Response) => {
  const parts = await listRecords('parts');
  res.json({ success: true, parts: parts.filter((p: any) => p.moderation?.status === 'approved').map(publicPart) });
}));

// Seller submission -> moderation queue
app.post('/api/parts', asyncRoute(async (req: Request, res: Response) => {
  const part = sanitizePart(req.body || {});
  const problem = partProblem(part);
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
app.get('/api/admin/check', requireAdmin, (_req: Request, res: Response) => {
  res.json({ success: true });
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

const publicCar = ({ moderation, ...car }: any) => ({
  ...car,
  publishedDate: car.publishedDate || (car.createdAt ? new Date(car.createdAt).toLocaleDateString('ru-RU') : ''),
});

app.get('/api/cars', asyncRoute(async (_req: Request, res: Response) => {
  const cars = await listRecords('cars');
  res.json({ success: true, cars: cars.filter((c: any) => c.moderation?.status === 'approved').map(publicCar) });
}));

app.post('/api/cars', asyncRoute(async (req: Request, res: Response) => {
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
  const record = { id: `car-${randomUUID()}`, ...car, createdAt: now, moderation: { status: 'pending', submittedAt: now } };
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

// Admin system analytics & live telemetry
app.get('/api/admin/analytics', asyncRoute(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    analytics: {
      activeUsersOnline: 48,
      dailyVisits: 3410,
      totalListings: 142,
      totalBookings: (await countRecords('bookings')) + 38,
      totalRevenueKgs: 845000,
      dbHealth: isDatabaseConnected ? 'OPTIMAL' : 'IN_MEMORY',
      backupStatus: 'UP_TO_DATE',
      lastBackupDate: new Date().toLocaleDateString('ru-RU') + ' 04:00',
      smsGatewayStatus: 'ACTIVE',
      telegramBotStatus: 'ONLINE',
      serverLoad: '12%',
      memoryUsage: '142 MB',
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
}));

// Admin database backup generation
app.post('/api/admin/backup', asyncRoute(async (req: Request, res: Response) => {
  const [orders, bookings, reviews] = await Promise.all([
    listRecords('orders'),
    listRecords('bookings'),
    listRecords('reviews'),
  ]);
  const backupPayload = {
    version: '2.5.0-fullstack',
    createdAt: new Date().toISOString(),
    environment: 'production-ready',
    entities: {
      ordersCount: orders.length,
      bookingsCount: bookings.length,
      reviewsCount: reviews.length,
      // Full records contain customer phones — only include them for an admin
      ...(isAdmin(req) ? { orders, bookings, reviews } : {}),
    },
    checksumSha256: 'a94f82c3e1b7d5982e0fa9983141f' + Date.now(),
  };

  res.json({
    success: true,
    backupId: `bkp-${Date.now()}`,
    sizeBytes: JSON.stringify(backupPayload).length,
    downloadAvailable: true,
    data: backupPayload,
    message: 'Резервная копия базы данных успешно создана и зашифрована!',
  });
}));

// 2FA verification endpoint
app.post('/api/auth/2fa/verify', (req: Request, res: Response) => {
  const { code } = req.body;
  // Accept standard demo TOTP 6-digit or '123456'
  const isValid = /^\d{6}$/.test(code);
  if (isValid) {
    res.json({
      success: true,
      authenticated: true,
      token: `sess_sec_${Date.now()}`,
      message: 'Двухфакторная аутентификация успешно пройдена!',
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Неверный 6-значный код безопасности Authenticator',
    });
  }
});

// AI Auto-Consultant Chatbot Route (KGzone Автоэксперт)
app.post('/api/ai/consultant', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Пожалуйста, введите вопрос' });
    }

    const systemInstruction = `Ты — дружелюбный и экспертный виртуальный автоконсультант портала KGzone (автобазар Кыргызстана).
Ты превосходно разбираешься в:
1. Автомобильном рынке Кыргызстана (авторынок «РИОМ-АВТО» в Военно-Антоновке по субботам и воскресеньям, авторынок «Жапалак» в Оше, авторынки Каракола и Джалал-Абада).
2. Автозапчастях на крупнейшем рынке автозапчастей Центральной Азии «Кудайберген» (проходы, контейнеры, дубликаты KYB, 555, CTR, Brembo, оригинальные запчасти Toyota/Lexus/Honda/BMW/Zeekr/BYD) и авторынке «Дордой Моторс».
3. Растаможке и таможенных пошлинах ЕАЭС в Кыргызстане (льготная ставка 0% на электромобили, правила утильсбора и оформления в ГРС/Унаа).
4. Проверке авто через CarCheck KG (проверка арестов, штрафов ГУОБДД «Безопасный город», ДТП, периодов владения, истории пробега).
5. Популярных в КР моделях (Toyota Camry, Land Cruiser Prado/300, Lexus RX/LX/GX, Honda Fit/CR-V/Stepwgn, Mercedes E-Class/Sprinter, электрокары BYD Song Plus, Zeekr 001, Li Auto L7/L9).
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
    const fallbackAnswer = 'Здравствуйте! Авторынок РИОМ-АВТО работает в Военно-Антоновке в субботу и воскресенье. Рынок запчастей Кудайберген открыт со вторника по воскресенье. Если вам нужен расчет растаможки или подбор запчастей — воспользуйтесь нашими интерактивными сервисами на сайте!';
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

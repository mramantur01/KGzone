// Demo cabinets: https://<site>/kabinet?demo=seller (or ?demo=company for a legal entity with CRM) opens a cabinet with
// made-up data without registration. Nothing is sent to the server: the account's API calls are answered
// here, and every change is refused with a notice. Public data (parts, cars, rates) stays real.

import COMMONS from '../data/demoPartPhotos.json';

const KEY = 'kgzone-demo-cabinet';

type DemoMode = 'seller' | 'buyer' | 'company';
const read = (): DemoMode | null => {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'company' ? 'company' : v === '1' || v === 'seller' || v === 'buyer' ? 'seller' : null;
  } catch { return null; }
};
let mode: DemoMode | null = read();

// Enter demo mode from the link before anything asks who is signed in
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const asked = params.get('demo');
  // Only the seller cabinet exists now; old ?demo=buyer links open it too
  if (asked === 'seller' || asked === 'buyer' || asked === 'company') {
    mode = asked === 'company' ? 'company' : 'seller';
    try { sessionStorage.setItem(KEY, mode); } catch { /* private mode: demo lasts until reload */ }
    params.delete('demo');
    const qs = params.toString();
    window.history.replaceState(null, '', '/kabinet' + (qs ? `?${qs}` : ''));
  }
}

export const isDemoCabinet = () => mode !== null;
export const demoCabinetMode = () => mode;

export function exitDemoCabinet(reload = true) {
  mode = null;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  if (reload) window.location.href = '/';
}

export const DEMO_REFUSED = 'Это демо-кабинет: изменения не сохраняются. Зарегистрируйтесь, чтобы пользоваться по-настоящему.';

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const demoUser = {
  id: 'demo-seller',
  accountType: 'individual',
  name: 'Бакыт (демо-продавец)',
  phone: '996700000000',
  email: '',
  city: 'Бишкек',
  role: 'user',
  blocked: false,
  phoneVerified: false,
  createdAt: day(40),
  garage: [{ id: 'g1', brand: 'Toyota', model: 'Camry', year: 2019, mileage: 98500, oilChangeMileage: 91000, oilInterval: 8000, inspectionUntil: day(-20).slice(0, 10) }],
  telegramLinked: false,
  termsAcceptedAt: day(40),
  verifiedSeller: true,
  shop: { about: 'Оригинал и контракт на Toyota и Lexus. Подбор по VIN, отправка в регионы.', market: 'Кудайберген', container: 'Ряд 3, контейнер 12', address: '', hours: 'Вт–Вс 8:30–17:00', mapUrl: '' },
};
const demoSellerProfile = {
  id: 'demo-seller', name: 'Бакыт, Кудайберген (демо)', accountType: 'individual', verified: true, city: 'Бишкек',
  since: day(40), lastSeenAt: day(0.02), shop: null as unknown, rating: 4.8, reviewsCount: 12,
};
const demoWatches = [
  { id: 'demo-w1', q: 'фара', brand: 'Toyota', model: 'Camry', createdAt: day(3) },
  { id: 'demo-w2', q: 'помпа', brand: 'Toyota', model: 'Land Cruiser Prado', createdAt: day(1) },
];
const demoMisses = [
  { id: 'm1', q: 'фара camry 70 левая', brand: 'Toyota', model: 'Camry', count: 23, lastAt: day(0.2) },
  { id: 'm2', q: 'помпа 1gd', brand: 'Toyota', model: 'Land Cruiser Prado', count: 17, lastAt: day(0.5) },
  { id: 'm3', q: 'датчик abs задний', brand: 'Lexus', model: 'RX', count: 11, lastAt: day(1) },
  { id: 'm4', q: 'стекло лобовое', brand: 'Toyota', model: 'RAV4', count: 8, lastAt: day(2) },
  { id: 'm5', q: 'шрус внутренний', brand: 'Toyota', model: 'Corolla', count: 6, lastAt: day(3) },
];

const part = (id: string, title: string, partNumber: string, priceKgs: number, stockCount: number, image: string | null, extra: Record<string, unknown> = {}) => ({
  id, title, partNumber, priceKgs, stockCount,
  brand: 'Toyota', model: 'Camry', generation: 'XV70', category: 'Тормозная система', condition: 'Новый (Оригинал)',
  inStock: stockCount > 0, stockStatus: stockCount > 1 ? 'В наличии' : stockCount === 1 ? 'Осталось мало' : 'Нет в наличии',
  image: image || '', images: image ? [image] : undefined,
  storeName: 'Бакыт, Кудайберген', storeCity: 'Бишкек', market: 'Кудайберген', sellerPhone: '+996 700 000 000',
  moderation: { status: 'approved' }, listingStatus: 'active', createdAt: day(5), views: 37, contactsCount: 4,
  ...extra,
});

// A made-up stock for the demo. Each item uses a photo of that kind of part (the same photos the
// site's example listings use); items marked null have no photo, to show the "Нет фото" state.
const PH = {
  pads: '/parts/wm-02.webp',
  engine2ar: '/parts/wm-03.webp',
  engineV6: '/parts/wm-04.webp',
  engineBmw: '/parts/wm-08.webp',
  cvt: '/parts/wm-10.webp',
  turbo: '/parts/wm-12.webp',
  alternator: '/parts/wm-14.webp',
  starter: '/parts/wm-16.webp',
  shock: 'https://images.unsplash.com/photo-1760836395763-25ea44ae8145?auto=format&fit=crop&w=600&q=80',
  airSpring: 'https://images.unsplash.com/photo-1760317890283-540a468b86f6?auto=format&fit=crop&w=600&q=80',
  radiator: 'https://images.unsplash.com/photo-1760804462190-82832c8eb582?auto=format&fit=crop&w=600&q=80',
  airStrut: 'https://images.unsplash.com/photo-1760317890353-5b156b3f9769?auto=format&fit=crop&w=600&q=80',
};
// title, OEM, make, model, price, photo, category, stock
const STOCK: [string, string, string, string, number, string | null, string, number][] = [
  ['Фара передняя правая ксенон RX 350', '81145-48D20', 'Lexus', 'RX', 24500, 'projector', 'Оптика', 2],
  ['Фара передняя ксенон W211 рестайлинг', 'A2118207661', 'Mercedes-Benz', 'E-Class', 21000, 'headlight', 'Оптика', 1],
  ['Фара левая LED Camry 70 (дубликат)', '81150-33K10-D', 'Toyota', 'Camry', 9800, 'headlight', 'Оптика', 4],
  ['Колодки тормозные передние RAV4', '04465-42180', 'Toyota', 'RAV4', 2600, PH.pads, 'Тормозная система', 8],
  ['Колодки тормозные передние (дубликат)', '04465-33471-D', 'Toyota', 'Camry', 1500, PH.pads, 'Тормозная система', 12],
  ['Двигатель 2AR-FE 2.5 контрактный', '19000-36380', 'Toyota', 'Camry', 165000, PH.engine2ar, 'Двигатель', 1],
  ['Двигатель 2GR-FE 3.5 контрактный', '19000-31D20', 'Lexus', 'RX', 230000, PH.engineV6, 'Двигатель', 1],
  ['Двигатель M54B30 3.0 контрактный', '11000304265', 'BMW', 'X5', 145000, PH.engineBmw, 'Двигатель', 0],
  ['Амортизатор передний Prado 150', '48510-69675', 'Toyota', 'Land Cruiser Prado', 7800, PH.shock, 'Подвеска', 4],
  ['Амортизатор передний (дубликат)', '48510-69675-D', 'Toyota', 'Land Cruiser Prado', 4200, PH.shock, 'Подвеска', 6],
  ['Рычаг передний нижний левый Fit', '51360-TF0-J01', 'Honda', 'Fit', 4600, 'arm', 'Подвеска', 3],
  ['Рычаг передний нижний (дубликат)', '51360-TF0-J01-D', 'Honda', 'Fit', 2500, 'arm', 'Подвеска', 5],
  ['Пневмобаллон задний W213', 'A2133200725', 'Mercedes-Benz', 'E-Class', 18000, PH.airSpring, 'Подвеска', 2],
  ['Пневмостойка передняя в сборе', '9011200100', 'Zeekr', '001', 52000, PH.airStrut, 'Подвеска', 1],
  ['Радиатор охлаждения основной', '17118654769', 'BMW', 'X5', 26000, PH.radiator, 'Система охлаждения', 2],
  ['Радиатор охлаждения (дубликат)', '16400-0H220-D', 'Toyota', 'Camry', 8500, PH.radiator, 'Система охлаждения', 3],
  ['Генератор 65A Matiz / Spark', '96567255', 'Daewoo', 'Matiz', 5500, PH.alternator, 'Электрика', 7],
  ['Стартер редукторный Нива', '5722.3708', 'Lada', 'Нива 4x4', 4900, PH.starter, 'Электрика', 10],
  ['Вариатор CVT Fit GE8 контрактный', '20031-RPC-000', 'Honda', 'Fit', 58000, PH.cvt, 'Трансмиссия', 2],
  ['Турбина Garrett Santa Fe 2.2 CRDi', '28231-2F700', 'Hyundai', 'Santa Fe', 39000, PH.turbo, 'Двигатель', 2],
  // Photos from Wikimedia Commons (scripts/photos/part-photos.mjs), credited on the part page
  ['Стойка стабилизатора передняя', '48820-33070', 'Toyota', 'Camry', 900, 'stabilizer', 'Подвеска', 14],
  ['Ступица передняя в сборе с подшипником', '43550-0R010', 'Toyota', 'RAV4', 7400, 'hub', 'Подвеска', 3],
  ['Свечи зажигания (4 шт)', '90919-01253', 'Toyota', 'Camry', 2400, 'sparkplug', 'Двигатель', 9],
  ['Колодки тормозные задние', '04466-48090', 'Lexus', 'RX', 2600, 'pads', 'Тормозная система', 6],
  ['Рычаг передний нижний левый', '54500-A6000', 'Kia', 'Ceed', 5200, 'arm', 'Подвеска', 4],
  ['Пыльник ШРУСа наружный (комплект)', '04438-33150', 'Toyota', 'Camry', 850, 'cvboot', 'Трансмиссия', 20],
  ['Привод (полуось) с ШРУСом', '43410-33320', 'Toyota', 'Camry', 9800, 'cvjoint', 'Трансмиссия', 2],
  ['Наконечник рулевой тяги', '45046-09550', 'Toyota', 'Corolla', 1400, 'tierod', 'Подвеска', 8],
  ['Комплект ремня ГРМ', '13568-09130', 'Toyota', 'Corolla', 4300, 'pump', 'Двигатель', 3],
  ['Ремень генератора поликлиновой', '90916-02671', 'Toyota', 'Land Cruiser Prado', 1300, 'belt', 'Двигатель', 11],
  ['Катушка зажигания', '90919-02240', 'Toyota', 'Corolla', 3100, 'coil', 'Электрика', 5],
  ['Генератор 90A восстановленный', '27060-0H160', 'Toyota', 'Camry', 9500, 'alternator', 'Электрика', 2],
  ['Стартер 1.4 кВт', '28100-0D110', 'Toyota', 'Corolla', 7600, 'starter', 'Электрика', 3],
  ['Аккумулятор 55 Ач 460 А', 'AKB-55-460', 'Toyota', 'Corolla', 7900, 'battery', 'Электрика', 6],
  ['Фильтр воздушный', '17801-0V020', 'Toyota', 'RAV4', 750, 'airfilter', 'Масла и фильтры', 15],
  ['Зеркало боковое правое', '87910-33C60', 'Toyota', 'Camry', 7200, 'mirror', 'Кузов', 2],
  ['Фара противотуманная левая', '4M5J-15K202', 'Ford', 'Focus', 3900, 'foglight', 'Оптика', 4],
];
const commons = COMMONS as Record<string, { src: string; author: string; license: string; url: string }>;
const MORE_PARTS = STOCK.map(([title, oem, brand, model, price, photo, category, stock], i) => part(
  `demo-s${i}`, title, oem, price, stock, photo && commons[photo] ? commons[photo].src : photo,
  { brand, model, category,
    photoCredit: photo && commons[photo] ? { author: commons[photo].author, license: commons[photo].license, url: commons[photo].url } : undefined, generation: '', condition: /дубликат/i.test(title) ? 'Дубликат (OEM)' : /контрактн/i.test(title) ? 'Б/у (Контрактный)' : 'Новый (Оригинал)',
    views: (i * 13) % 90 + 3, contactsCount: i % 6, createdAt: day(i * 0.7 + 1) },
));

const demoListings = {
  parts: [
    part('demo-p1', 'Колодки тормозные передние Camry 70', '04465-33471', 2800, 6, '/parts/wm-02.webp', { views: 112, contactsCount: 9 }),
    part('demo-p2', 'Фара левая LED Camry 70', '81150-33K10', 18500, 1, '/parts/demo/projector.webp', { category: 'Оптика', views: 64 }),
    part('demo-p3', 'Амортизатор передний правый', '48510-80000', 3200, 4, null, { category: 'Подвеска', views: 0, contactsCount: 0 }),
    part('demo-p4', 'Генератор 90A Camry 2.5', '27060-36070', 12500, 0, '/parts/wm-14.webp', { category: 'Электрика', views: 23 }),
    part('demo-p5', 'Радиатор охлаждения Camry 70', '16400-F0010', 11500, 2, 'https://images.unsplash.com/photo-1760804462190-82832c8eb582?auto=format&fit=crop&w=600&q=80', { category: 'Система охлаждения', moderation: { status: 'pending' }, views: 0, contactsCount: 0 }),
    ...MORE_PARTS,
  ],
  cars: [],
};

const demoConversation = {
  id: 'demo-c1', kind: 'parts', listingId: 'demo-p1', listingTitle: 'Колодки тормозные передние Camry 70', listingImage: '/parts/wm-02.webp',
  role: 'seller', otherName: 'Нурлан',
  lastMessage: { text: 'Скиньте номер карты для предоплаты, отправлю такси.', at: day(0.02), from: 'buyer' },
  lastAt: day(0.02), unread: 1,
};
const demoMessages = [
  { id: 'm1', text: 'Здравствуйте! Колодки на Camry 70 ещё есть?', at: day(0.05), mine: false },
  { id: 'm2', text: 'Здравствуйте, да, есть 6 комплектов. Оригинал.', at: day(0.04), mine: true },
  { id: 'm3', text: 'Скиньте номер карты для предоплаты, отправлю такси.', at: day(0.02), mine: false },
];

const demoRequests = {
  brands: ['toyota'],
  requests: [
    { id: 'demo-r1', part: 'Радиатор охлаждения', brand: 'Toyota', model: 'Camry', generation: 'XV70', name: 'Азамат', phone: '996555000000', createdAt: day(0.3) },
    { id: 'demo-r2', part: 'Зеркало правое с подогревом', brand: 'Toyota', model: 'RAV4', comment: 'Можно б/у в хорошем состоянии', name: 'Айгуль', phone: '996777000000', createdAt: day(1.2) },
  ],
};

// ---- demo buyer ----
const demoBuyer = {
  id: 'demo-buyer',
  accountType: 'individual',
  name: 'Азамат (демо-покупатель)',
  phone: '996555000000',
  email: '',
  city: 'Бишкек',
  role: 'user',
  blocked: false,
  phoneVerified: false,
  createdAt: day(20),
  garage: [
    { id: 'gb1', brand: 'Toyota', model: 'Camry', year: 2018, vin: 'JTNB11HK0J3012345', mileage: 124300, oilChangeMileage: 116500, oilInterval: 8000, insuranceUntil: day(-12).slice(0, 10) },
    { id: 'gb2', brand: 'Honda', model: 'Fit', year: 2014, mileage: 186000, oilChangeMileage: 184000, oilInterval: 7000 },
  ],
  telegramLinked: false,
  termsAcceptedAt: day(20),
};
const buyerConversation = {
  id: 'demo-bc1', kind: 'parts', listingId: 'demo-p1', listingTitle: 'Колодки тормозные передние Camry 70', listingImage: '/parts/wm-02.webp',
  role: 'buyer', otherName: 'Бакыт, Кудайберген', otherId: 'demo-seller',
  lastMessage: { text: 'Да, есть. Подъезжайте, контейнер 12, до 17:00.', at: day(1.5), from: 'seller' },
  lastAt: day(1.5), unread: 1,
};
const buyerMessages = [
  { id: 'b1', text: 'Здравствуйте! Колодки на Camry 2018 есть?', at: day(0.06), mine: true },
  { id: 'b2', text: 'Да, есть. Подъезжайте, контейнер 12, до 17:00.', at: day(0.03), mine: false },
];
const buyerOrders = [
  { id: 'demo-o1', orderNumber: 'KGZ-1042', partTitle: 'Фильтр масляный оригинал', priceKgs: 650, storeName: 'Бакыт, Кудайберген', status: 'Выполнен', createdAt: new Date(Date.now() - 9 * 86_400_000).toLocaleDateString('ru-RU') },
];

const refused = () => { throw Object.assign(new Error(DEMO_REFUSED), { status: 403 }); };

/** Answer for an API call in demo mode, or undefined to let a public request through */
export function demoResponse(url: string, method: string): unknown {
  const path = url.split('?')[0];
  if (path === '/api/auth/logout') { exitDemoCabinet(false); return { success: true }; }
  if (method !== 'GET') {
    // Public, harmless actions still work (complaints, view counters)
    if (path === '/api/reports' || path.startsWith('/api/stats/') || path === '/api/search-misses') return undefined;
    return refused();
  }
  const buyer = mode === 'buyer';
  if (path === '/api/auth/me') return { success: true, user: mode === 'company' ? demoCompanyUser : buyer ? demoBuyer : demoUser };
  if (path === '/api/my/listings') return { success: true, ...(buyer ? { parts: [], cars: [] } : demoListings) };
  if (path === '/api/my/orders') return { success: true, orders: buyer ? buyerOrders : [] };
  if (path === '/api/conversations') return { success: true, conversations: [buyer ? buyerConversation : demoConversation], unread: 1 };
  if (path.startsWith('/api/conversations/')) {
    return buyer ? { success: true, conversation: buyerConversation, messages: buyerMessages } : { success: true, conversation: demoConversation, messages: demoMessages };
  }
  if (path === '/api/watches') return { success: true, watches: buyer ? demoWatches : [] };
  if (path === '/api/notifications') {
    const items = buyer
      ? [
          { id: 'dn1', text: '🔔 Появилось то, что вы искали: Колодки тормозные передние Toyota Camry 70 — 3 200 сом', at: day(0.05) },
          { id: 'dn2', text: '💬 Новое сообщение от продавца «Авто-Деталь Кудайберген»: Да, в наличии, приезжайте.', at: day(0.4) },
        ]
      : [
          { id: 'dn1', text: '💬 Новое сообщение по «Амортизатор передний Toyota Camry 70»\nАйбек: Здравствуйте, ещё в наличии?', at: day(0.03) },
          { id: 'dn2', text: '✅ Объявление «Фара левая Lexus RX 350» одобрено и опубликовано.', at: day(1) },
          { id: 'dn3', text: '👑 Поздравляем! KGzone отметил вас как проверенного продавца.', at: day(5) },
        ];
    return { success: true, items, unread: 1, readAt: day(0.2) };
  }
  if (path === '/api/search-misses/for-me') return { success: true, misses: buyer ? [] : demoMisses, brands: buyer ? [] : ['toyota', 'lexus'] };
  if (path === '/api/sellers/demo-seller/reviews') {
    return { success: true, seller: { id: 'demo-seller', name: demoSellerProfile.name, accountType: 'individual', verified: true, since: day(40), lastSeenAt: day(0.02) }, rating: 4.8, reviews: [], canReview: buyer };
  }
  if (path === '/api/sellers/demo-seller') return { success: true, seller: { ...demoSellerProfile, shop: demoUser.shop } };
  if (path === '/api/part-requests/for-me') return { success: true, ...(buyer ? { brands: [], requests: [] } : demoRequests) };
  if (mode === 'company' && (path === '/api/company' || path.startsWith('/api/company/'))) {
    const answer = demoCompanyResponse(path);
    if (answer !== undefined) return answer;
  }
  if (path === '/api/company' || path.startsWith('/api/company/') || path.startsWith('/api/admin/')) {
    throw Object.assign(new Error('Недоступно в демо-кабинете'), { status: 404 });
  }
  return undefined;
}

// ---- Demo company (legal entity) with CRM ----
const demoCompanyUser = {
  ...demoUser,
  accountType: 'legal',
  name: 'Айбек Токтогулов',
  verifiedSeller: false,
  company: {
    name: 'ОсОО «Авто-Деталь Кудайберген»', inn: '02305201910123', legalAddress: 'г. Бишкек, ул. Примерная, 1', actualAddress: 'Рынок Кудайберген, ряд 3, конт. 12',
    contactPerson: 'Айбек Токтогулов', contactPhone: '996700000000', contactEmail: '', bankDetails: 'Демо-банк, р/с 1234567890', status: 'verified',
  },
};
const demoCompanyInfo = {
  success: true,
  role: 'owner',
  permissions: ['catalog.edit', 'stock.edit', 'import', 'export', 'orders', 'orders.view', 'messages', 'staff', 'warehouses', 'company.edit', 'finance', 'audit'],
  company: {
    id: 'demo-seller', name: demoCompanyUser.company.name, inn: demoCompanyUser.company.inn, status: 'verified', city: 'Бишкек',
    legalAddress: demoCompanyUser.company.legalAddress, actualAddress: demoCompanyUser.company.actualAddress, contactPhone: '996700000000',
    bankDetails: demoCompanyUser.company.bankDetails,
    warehouses: [{ id: 'w1', name: 'Контейнер на Кудайбергене', address: 'Ряд 3, конт. 12' }, { id: 'w2', name: 'Склад Аламедин', address: 'ул. Примерная, 15' }],
  },
};
const dayOnly = (n: number) => new Date(Date.now() + 6 * 3600_000 - n * 86_400_000).toISOString().slice(0, 10);
const demoTeam = [{ id: 'demo-seller', name: 'Айбек Токтогулов' }, { id: 'demo-m1', name: 'Нурлан (продажи)' }, { id: 'demo-m2', name: 'Элиза (продажи)' }];
const crm = (id: string, source: string, name: string, interest: string, stage: string, amountKgs: number, nextAt: string, manager: number | null, created: number, note = '', phone = '') => ({
  id, source, name, phone, interest, stage, amountKgs, note, nextAt,
  managerId: manager === null ? '' : demoTeam[manager].id, managerName: manager === null ? '' : demoTeam[manager].name,
  conversationId: source === 'chat' ? 'demo-conv' : undefined,
  log: [
    ...(stage !== 'new' ? [{ at: day(created / 2), by: manager === null ? demoTeam[0].name : demoTeam[manager].name, text: 'Этап: Новый → ' + ({ work: 'В работе', waiting: 'Ждёт оплату', won: 'Продано', lost: 'Отказ' } as Record<string, string>)[stage] }] : []),
    { at: day(created), by: 'KGzone', text: source === 'chat' ? 'Написал в чат на сайте' : source === 'order' ? 'Оформил заказ на сайте' : 'Клиент добавлен вручную' },
  ],
  createdAt: day(created), updatedAt: day(created / 3),
});
const demoCrm = [
  crm('dc1', 'chat', 'Айбек', 'Амортизатор передний Toyota Camry 70', 'new', 6400, dayOnly(0), 1, 0.1, 'Нужна пара, спросить VIN'),
  crm('dc2', 'chat', 'Марат', 'Фара левая LED Camry 70', 'new', 18500, '', null, 0.4),
  crm('dc3', 'order', 'Сергей', 'Колодки тормозные передние Camry 70 (заказ KGZ-9012)', 'work', 2800, dayOnly(0), 2, 1, 'Самовывоз в субботу', '+996 555 123 456'),
  crm('dc4', 'manual', 'СТО «Мастер Авто»', 'Расходники на 5 машин в месяц: фильтры, масло, колодки', 'work', 45000, dayOnly(2), 0, 3, 'Постоянный клиент, скидка 7%', '+996 700 987 654'),
  crm('dc5', 'chat', 'Динара', 'Генератор 90A Camry 2.5', 'waiting', 12500, dayOnly(-1), 1, 2, 'Переведёт после 18:00'),
  crm('dc6', 'manual', 'Такси-парк «Жолдош»', 'Стойки и сайлентблоки на 12 Honda Fit', 'waiting', 96000, dayOnly(1), 0, 6, 'Счёт на оплату отправлен', '+996 312 000 111'),
  crm('dc7', 'order', 'Бакыт', 'Радиатор охлаждения Camry 70 (заказ KGZ-8990)', 'won', 11500, '', 2, 8, '', '+996 777 222 333'),
  crm('dc8', 'chat', 'Эрлан', 'Двигатель 2AR-FE контрактный', 'won', 118000, '', 0, 12),
  crm('dc9', 'chat', 'Улан', 'Бампер передний Lexus RX', 'lost', 22000, '', 1, 9, 'Нашёл дешевле'),
];
const demoCompanyOrders = [
  { id: 'do1', orderNumber: 'KGZ-9012', createdAt: day(1), customerName: 'Сергей', customerPhone: '+996 555 123 456', partId: 'demo-p1', partTitle: 'Колодки тормозные передние Camry 70', partNumber: '04465-33471', storeName: demoCompanyUser.company.name, storeLocation: 'Ряд 3, конт. 12', priceKgs: 2800, deliveryType: 'pickup', deliveryAddress: '', status: 'В обработке' },
  { id: 'do2', orderNumber: 'KGZ-8990', createdAt: day(8), customerName: 'Бакыт', customerPhone: '+996 777 222 333', partId: 'demo-p5', partTitle: 'Радиатор охлаждения Camry 70', partNumber: '16400-F0010', storeName: demoCompanyUser.company.name, storeLocation: 'Ряд 3, конт. 12', priceKgs: 11500, deliveryType: 'delivery', deliveryAddress: 'Бишкек, мкр. Джал', status: 'Выполнен' },
];
function demoCompanyResponse(path: string): unknown {
  const parts = demoListings.parts as any[];
  if (path === '/api/company') return demoCompanyInfo;
  if (path === '/api/company/crm') return { success: true, clients: demoCrm, team: demoTeam, stages: ['new', 'work', 'waiting', 'won', 'lost'] };
  if (path === '/api/company/parts') return { success: true, parts };
  if (path === '/api/company/orders') return { success: true, orders: demoCompanyOrders, statuses: ['Новый', 'В обработке', 'Готов к выдаче', 'Выполнен', 'Отменен'] };
  if (path === '/api/company/staff') {
    return { success: true, staff: [
      { id: 'dm1', userId: 'demo-m1', role: 'sales_manager', createdAt: day(30), name: 'Нурлан (продажи)', phone: '996700111222', blocked: false },
      { id: 'dm2', userId: 'demo-m2', role: 'sales_manager', createdAt: day(20), name: 'Элиза (продажи)', phone: '996700333444', blocked: false },
      { id: 'dm3', userId: 'demo-m3', role: 'warehouse', createdAt: day(15), name: 'Бекзат (склад)', phone: '996700555666', blocked: false },
    ] };
  }
  if (path === '/api/company/audit') {
    return { success: true, entries: [
      { id: 'da1', at: day(0.1), actorName: 'Нурлан (продажи)', action: 'order-status', target: 'do1', details: { status: 'В обработке', orderNumber: 'KGZ-9012' } },
      { id: 'da2', at: day(1), actorName: 'Айбек Токтогулов', action: 'import', target: '', details: { created: 34, updated: 8 } },
      { id: 'da3', at: day(2), actorName: 'Бекзат (склад)', action: 'bulk-stock', target: '', details: { count: 12 } },
    ] };
  }
  if (path === '/api/company/stats') {
    const live = parts.filter((p) => (p.moderation?.status || 'approved') === 'approved');
    const views = parts.reduce((n, p) => n + (p.views || 0), 0);
    const contacts = parts.reduce((n, p) => n + (p.contactsCount || 0), 0);
    return {
      success: true,
      listings: { total: parts.length, active: live.length, pending: parts.length - live.length, rejected: 0, archived: 0, sold: 0, outOfStock: live.filter((p) => !p.stockCount).length },
      views, contacts, conversion: views ? Math.round((contacts / views) * 1000) / 10 : 0,
      orders: { total: 2, open: 1, completed: 1, revenueKgs: 11500 },
      top: [...parts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((p) => ({ id: p.id, title: p.title, views: p.views || 0, contacts: p.contactsCount || 0 })),
    };
  }
  return undefined;
}

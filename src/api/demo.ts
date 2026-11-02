// Demo seller cabinet: https://<site>/kabinet?demo=seller opens a cabinet with made-up data
// without registration. Nothing is sent to the server: the account's API calls are answered
// here, and every change is refused with a notice. Public data (parts, cars, rates) stays real.

const KEY = 'kgzone-demo-cabinet';

const read = () => {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
let active = read();

// Enter demo mode from the link before anything asks who is signed in
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'seller') {
    active = true;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: demo lasts until reload */ }
    params.delete('demo');
    const qs = params.toString();
    window.history.replaceState(null, '', '/kabinet' + (qs ? `?${qs}` : ''));
  }
}

export const isDemoCabinet = () => active;

export function exitDemoCabinet(reload = true) {
  active = false;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  if (reload) window.location.href = '/';
}

export const DEMO_REFUSED = 'Это демо-кабинет: изменения не сохраняются. Зарегистрируйтесь, чтобы продавать по-настоящему.';

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
};

const part = (id: string, title: string, partNumber: string, priceKgs: number, stockCount: number, image: string | null, extra: Record<string, unknown> = {}) => ({
  id, title, partNumber, priceKgs, stockCount,
  brand: 'Toyota', model: 'Camry', generation: 'XV70', category: 'Тормозная система', condition: 'Новый (Оригинал)',
  inStock: stockCount > 0, stockStatus: stockCount > 1 ? 'В наличии' : stockCount === 1 ? 'Осталось мало' : 'Нет в наличии',
  image: image || '', images: image ? [image] : undefined,
  storeName: 'Бакыт, Кудайберген', storeCity: 'Бишкек', market: 'Кудайберген', sellerPhone: '+996 700 000 000',
  moderation: { status: 'approved' }, listingStatus: 'active', createdAt: day(5), views: 37, contactsCount: 4,
  ...extra,
});

// A large made-up stock so the demo shows search, filters and pages like a real parts seller
const STOCK: [string, string, string, number, string][] = [
  ['Стойка стабилизатора передняя', '48820-33070', 'Toyota', 900, 'Camry'], ['Ступица задняя в сборе', '42450-48041', 'Lexus', 6200, 'RX'],
  ['Подушка двигателя правая', '12362-0V010', 'Toyota', 4100, 'Camry'], ['Свечи зажигания Denso (4 шт)', '90919-01253', 'Toyota', 2400, 'Camry'],
  ['Фильтр воздушный', '17801-0V020', 'Toyota', 750, 'RAV4'], ['Фильтр салона угольный', '87139-33010', 'Toyota', 600, 'Camry'],
  ['Рычаг передний нижний левый', '48069-33060', 'Toyota', 5300, 'Camry'], ['Шаровая опора', '43330-09510', 'Toyota', 1900, 'Corolla'],
  ['Колодки задние', '04466-48090', 'Lexus', 2600, 'RX'], ['Диск тормозной передний', '43512-48140', 'Lexus', 5400, 'RX'],
  ['Помпа водяная', '16100-29415', 'Toyota', 4800, 'Land Cruiser Prado'], ['Ремень генератора', '90916-02671', 'Toyota', 1300, 'Prado'],
  ['Амортизатор задний', '48530-80424', 'Toyota', 3600, 'Camry'], ['Пыльник ШРУСа', '04438-33150', 'Toyota', 850, 'Camry'],
  ['Зеркало правое с подогревом', '87910-33C60', 'Toyota', 7200, 'Camry'], ['Фара противотуманная', '81210-06052', 'Toyota', 3900, 'Camry'],
  ['Колодки передние Honda', '45022-T5A-J01', 'Honda', 2300, 'Fit'], ['Фильтр масляный Honda', '15400-RTA-003', 'Honda', 550, 'CR-V'],
  ['Сайлентблок рычага', '51391-TF0-003', 'Honda', 1100, 'Fit'], ['Стойка стабилизатора Honda', '51320-TF0-003', 'Honda', 800, 'Fit'],
  ['Катушка зажигания', '30520-RNA-A01', 'Honda', 3100, 'Civic'], ['Датчик кислорода', '36531-RNA-A01', 'Honda', 4600, 'Civic'],
  ['Радиатор охлаждения', '16400-0H220', 'Toyota', 11500, 'Camry'], ['Термостат', '90916-03129', 'Toyota', 1700, 'Camry'],
  ['Бачок омывателя', '85315-33350', 'Toyota', 2100, 'Camry'], ['Щётки стеклоочистителя (пара)', '85222-33190', 'Toyota', 1200, 'Camry'],
  ['Подшипник ступицы', '90369-43008', 'Toyota', 2700, 'Corolla'], ['Тяга рулевая', '45503-09510', 'Toyota', 2200, 'Corolla'],
  ['Наконечник рулевой', '45046-09550', 'Toyota', 1400, 'Corolla'], ['Датчик ABS передний', '89542-33060', 'Toyota', 3300, 'Camry'],
];
const PHOTOS = ['/parts/wm-01.jpg', '/parts/wm-02.jpg', '/parts/wm-03.jpg', '/parts/wm-10.jpg', '/parts/wm-15.jpg'];
const MORE_PARTS = STOCK.flatMap(([title, oem, brand, price, model], i) => [0, 1].map((k) => part(
  `demo-s${i}-${k}`, k ? `${title} (дубликат)` : title, k ? `${oem}-D` : oem, k ? Math.round(price * 0.6) : price,
  (i * 7 + k * 3) % 9 === 0 ? 0 : ((i + k) % 5) + 1, (i + k) % 11 === 4 ? null : PHOTOS[(i + k) % PHOTOS.length],
  { brand, model, condition: k ? 'Дубликат (OEM)' : 'Новый (Оригинал)', views: (i * 13 + k * 7) % 90, contactsCount: (i + k) % 6, createdAt: day(i + k) },
)));

const demoListings = {
  parts: [
    part('demo-p1', 'Колодки тормозные передние Camry 70', '04465-33471', 2800, 6, '/parts/wm-02.jpg', { views: 112, contactsCount: 9 }),
    part('demo-p2', 'Фара левая LED Camry 70', '81150-33K10', 18500, 1, '/parts/wm-01.jpg', { category: 'Оптика', views: 64 }),
    part('demo-p3', 'Амортизатор передний правый', '48510-80000', 3200, 4, null, { category: 'Подвеска', views: 0, contactsCount: 0 }),
    part('demo-p4', 'Фильтр масляный оригинал', '90915-YZZE1', 650, 0, '/parts/wm-10.jpg', { category: 'Масла и фильтры', views: 23 }),
    part('demo-p5', 'Радиатор кондиционера', '88460-06380', 9500, 2, '/parts/wm-15.jpg', { moderation: { status: 'pending' }, views: 0, contactsCount: 0 }),
    ...MORE_PARTS,
  ],
  cars: [],
};

const demoConversation = {
  id: 'demo-c1', kind: 'parts', listingId: 'demo-p1', listingTitle: 'Колодки тормозные передние Camry 70', listingImage: '/parts/wm-02.jpg',
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

const refused = () => { throw Object.assign(new Error(DEMO_REFUSED), { status: 403 }); };

/** Answer for an API call in demo mode, or undefined to let a public request through */
export function demoResponse(url: string, method: string): unknown {
  const path = url.split('?')[0];
  if (path === '/api/auth/logout') { exitDemoCabinet(false); return { success: true }; }
  if (method !== 'GET') {
    // Public, harmless actions still work (complaints, view counters)
    if (path === '/api/reports' || path.startsWith('/api/stats/')) return undefined;
    return refused();
  }
  if (path === '/api/auth/me') return { success: true, user: demoUser };
  if (path === '/api/my/listings') return { success: true, ...demoListings };
  if (path === '/api/my/orders') return { success: true, orders: [] };
  if (path === '/api/conversations') return { success: true, conversations: [demoConversation], unread: 1 };
  if (path.startsWith('/api/conversations/')) return { success: true, conversation: demoConversation, messages: demoMessages };
  if (path === '/api/part-requests/for-me') return { success: true, ...demoRequests };
  if (path === '/api/company' || path.startsWith('/api/company/') || path.startsWith('/api/admin/')) {
    throw Object.assign(new Error('Недоступно в демо-кабинете'), { status: 404 });
  }
  return undefined;
}

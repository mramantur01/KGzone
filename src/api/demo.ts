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

const demoListings = {
  parts: [
    part('demo-p1', 'Колодки тормозные передние Camry 70', '04465-33471', 2800, 6, '/parts/wm-02.jpg', { views: 112, contactsCount: 9 }),
    part('demo-p2', 'Фара левая LED Camry 70', '81150-33K10', 18500, 1, '/parts/wm-01.jpg', { category: 'Оптика', views: 64 }),
    part('demo-p3', 'Амортизатор передний правый', '48510-80000', 3200, 4, null, { category: 'Подвеска', views: 0, contactsCount: 0 }),
    part('demo-p4', 'Фильтр масляный оригинал', '90915-YZZE1', 650, 0, '/parts/wm-10.jpg', { category: 'Масла и фильтры', views: 23 }),
    part('demo-p5', 'Радиатор кондиционера', '88460-06380', 9500, 2, '/parts/wm-15.jpg', { moderation: { status: 'pending' }, views: 0, contactsCount: 0 }),
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

export type Currency = 'USD' | 'KGS';
export type Language = 'ru' | 'kg' | 'en';

export interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  generation?: string;
  priceUsd: number;
  city: string;
  region: string;
  bodyType: 'Седан' | 'Кроссовер' | 'Внедорожник' | 'Хэтчбек' | 'Минивэн' | 'Универсал' | 'Пикап' | 'Купе' | 'Лифтбек';
  transmission: 'Автомат' | 'Вариатор' | 'Механика' | 'Робот';
  steering: 'Левый' | 'Правый';
  fuelType: 'Бензин' | 'Газ-бензин' | 'Дизель' | 'Гибрид' | 'Электро';
  engineVolume: number; // in liters, e.g. 2.5 (0 for EV)
  powerHp: number;
  mileageKm: number;
  drive: 'Передний' | 'Полный (4WD)' | 'Задний';
  customs: 'Растаможен в КР' | 'Не растаможен' | 'Учет РФ' | 'Учет ЕАЭС';
  color: string;
  isUrgent?: boolean;
  isExchange?: boolean;
  isGoodPrice?: boolean;
  hasCarCheckPass: boolean;
  plateNumber: string; // e.g. "01 KG 777 AAA"
  vin: string;
  viewsCount: number;
  publishedDate: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  description: string;
  features: string[];
  image: string;
  photos: string[];
  photoCredit?: { text: string; url: string };
  sellerId?: string;
}

export interface CarCheckReport {
  plateNumber: string;
  vin: string;
  brandModel: string;
  year: number;
  engineVolume: string;
  color: string;
  registrationDate: string;
  status: 'Чистый' | 'Имеются штрафы' | 'Арест / Залог';
  finesCount: number;
  finesTotalKgs: number;
  hasArrest: boolean;
  hasPledge: boolean; // залог
  isWanted: boolean; // угон
  taxPaidYear: number;
  techInspectionValidUntil: string;
  ownersCount: number;
  registeredCity: string;
  tintingPermit: boolean; // тонировка
}

export interface AutoReview {
  id: string;
  carTitle: string;
  year: number;
  author: string;
  city: string;
  rating: number; // out of 10
  date: string;
  experienceYears: number;
  pros: string[];
  cons: string[];
  text: string;
  mountainPassScore: number; // out of 10 (Оценка для перевала Төө-Ашуу / Боом)
  likes: number;
}

export interface PartCompatibility {
  brand: string;
  model: string;
  bodyCode?: string;
  years: string;
  engine?: string;
}

export interface AutoPartItem {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  brand: string;
  model: string;
  year?: number;
  yearRange?: string;
  generation?: string;
  bodyCode?: string;
  partNumber: string; // OEM / артикул
  priceKgs: number;
  condition: 'Новый (Оригинал)' | 'Б/у (Контрактный)' | 'Дубликат (OEM)' | 'Новый' | 'Б/У с разбора' | 'Восстановленная';
  inStock: boolean;
  stockCount: number;
  stockStatus: 'В наличии' | 'В наличии на складе' | 'Под заказ (2-3 дня)' | 'Осталось мало' | 'Бронь' | 'Продано';
  market: 'Кудайберген' | 'Дордой Моторс' | 'Дордой-Авто' | 'База Автозапчастей Ош' | 'Авторазбор Бишкек' | 'РИОМ Авто' | 'Баят' | 'Жапалак Ош' | 'Заказ из Дубая/Китая' | string;
  storeName: string;
  storeLocation: string; // Ряд, контейнер или адрес
  storeCity: string;
  sellerPhone: string;
  sellerWhatsapp?: string;
  image: string;
  images?: string[];
  /** Required for photos under CC BY / CC BY-SA licenses */
  photoCredit?: { author: string; license: string; url: string };
  videoUrl?: string;
  videoTitle?: string;
  hasCompressionVideo?: boolean;
  compressionBar?: number;
  compatibility?: PartCompatibility[];
  sellerType?: 'legal' | 'individual';
  companyName?: string;
  inn?: string;
  containerInfo?: string;
  directionsGuide?: string;
  paymentMethods?: string[];
  countryOfImport?: string;
  warrantyDays?: number;
  description?: string;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  sku?: string;
  crossNumbers?: string[];
  manufacturer?: string;
  warehouseId?: string;
  oldPriceKgs?: number;
  /** Registered seller (database listings only) */
  sellerId?: string;
  sellerVerified?: boolean;
  sellerRating?: number;
  sellerReviewsCount?: number;
  views?: number;
  createdAt?: string;
  originalType?: 'original' | 'analog';
  subPartName?: string;
  city?: string;
}

export interface PartOrderRequest {
  partId: string;
  partTitle: string;
  partNumber: string;
  priceKgs: number;
  storeName: string;
  storeLocation: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'pickup' | 'delivery_bishkek' | 'delivery_regions';
  address?: string;
  comment?: string;
}

export type UserSiteRole = 'owner' | 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  registeredDate: string;
  avatar: string;
  activeRole: 'buyer' | 'seller';
  siteRole: UserSiteRole;
  isApprovedAdmin: boolean;
  adminRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  walletBalanceKgs: number;
  isPhoneVerified: boolean;
  activeAdsCount: number;
  dealsCount: number;
  rating: number;
}

export interface RegisteredUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserSiteRole;
  isApproved: boolean;
  registeredAt: string;
  adsCount: number;
  status: 'active' | 'pending_admin' | 'blocked';
  city: string;
}

export interface SiteSettings {
  siteTitle: string;
  contactPhone: string;
  whatsappPhone: string;
  usdToKgsRate: number;
  announcementText: string;
  isAnnouncementActive: boolean;
  telegramBotToken: string;
  telegramChannel: string;
  commissionPercent: number;
  heroAutoPlaySpeed: number;
}

export interface BuyerOrder {
  id: string;
  orderNumber: string;
  date: string;
  partTitle: string;
  partNumber: string;
  storeName: string;
  storeLocation: string;
  storePhone: string;
  priceKgs: number;
  status: 'Забронирован' | 'В пути / Курьер' | 'Готов к выдаче' | 'Выполнен' | 'Отменен';
  deliveryType: 'Самовывоз' | 'Доставка по Бишкеку' | 'Отправка в регионы';
  deliveryAddress?: string;
}

export interface SellerIncomingOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  partTitle: string;
  partNumber: string;
  priceKgs: number;
  status: 'Новый' | 'Подтвержден' | 'Готов к выдаче' | 'Завершен' | 'Отклонен';
  deliveryType: 'Самовывоз' | 'Доставка по Бишкеку' | 'Отправка в регионы';
  deliveryAddress?: string;
  comment?: string;
}

export interface SavedCarCheck {
  id: string;
  plateNumber: string;
  carTitle: string;
  checkDate: string;
  status: 'Чистый' | 'Имеются штрафы' | 'Арест / Залог';
  finesCount: number;
  finesTotalKgs: number;
  hasArrest: boolean;
  hasPledge: boolean;
}

export interface SellerStoreProfile {
  storeName: string;
  market: string;
  location: string;
  phone: string;
  whatsapp: string;
  schedule: string;
  description: string;
  totalPartsCount: number;
  activeSince: string;
}

export interface AutoNews {
  id: string;
  title: string;
  snippet: string;
  date: string;
  views: number;
  category: 'Законодательство' | 'Авторынок' | 'Дороги КР' | 'Электромобили';
  readTime: string;
}

export interface WorkshopService {
  id: string;
  title: string;
  titleKg?: string;
  titleEn?: string;
  category: 'engine' | 'suspension' | 'diagnostics' | 'oil_maintenance' | 'electric' | 'detailing_body' | 'hybrid_ev';
  priceKgs: number;
  estimatedDuration: string;
  description: string;
  isPopular?: boolean;
}

export interface WorkshopMaster {
  id: string;
  name: string;
  specialization: string;
  specializationKg?: string;
  specializationEn?: string;
  experienceYears: number;
  rating: number;
  avatar: string;
  availableDays: string[];
}

export interface WorkshopBooking {
  id: string;
  bookingNumber: string;
  serviceId: string;
  serviceTitle: string;
  masterId: string;
  masterName: string;
  date: string;
  timeSlot: string;
  carBrandModel: string;
  clientName: string;
  clientPhone: string;
  paymentMethod: 'cash' | 'mbank' | 'elkart' | 'odengi' | 'card' | 'optima';
  status: 'Ожидает подтверждения' | 'Подтверждено' | 'В работе' | 'Завершено' | 'Отменено';
  totalPriceKgs: number;
  createdAt: string;
  workshopLocation: string;
  telegramNotified?: boolean;
}

export interface WorkshopWorkGallery {
  id: string;
  title: string;
  carModel: string;
  year: number;
  category: string;
  beforeImage: string;
  afterImage: string;
  description: string;
  masterName: string;
  completionTime: string;
  costKgs: number;
  rating: number;
}

export interface UserReview {
  id: string;
  authorName: string;
  city: string;
  category: 'service' | 'car_purchase' | 'parts' | 'carcheck';
  targetTitle: string;
  rating: number; // 1-5
  date: string;
  text: string;
  pros?: string;
  cons?: string;
  avatar?: string;
  verifiedPurchase: boolean;
  likes: number;
}

export interface FaqItem {
  id: string;
  question: string;
  questionKg?: string;
  questionEn?: string;
  answer: string;
  answerKg?: string;
  answerEn?: string;
  category: 'buying' | 'customs' | 'carcheck' | 'parts' | 'workshop' | 'payment_security';
}

export interface PromotionItem {
  id: string;
  badge: string;
  title: string;
  titleKg?: string;
  titleEn?: string;
  description: string;
  discountPercent?: number;
  promoCode: string;
  validUntil: string;
  serviceCategory: string;
  image: string;
}

export interface AdminLogItem {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  action: string;
  details: string;
  user: string;
  ip: string;
}

export interface SystemAnalytics {
  activeUsersOnline: number;
  dailyVisits: number;
  totalListings: number;
  totalBookings: number;
  totalRevenueKgs: number;
  dbHealth: 'OPTIMAL' | 'DEGRADED';
  backupStatus: 'UP_TO_DATE' | 'BACKUP_REQUIRED';
  lastBackupDate: string;
  smsGatewayStatus: 'ACTIVE';
  telegramBotStatus: 'ONLINE';
}


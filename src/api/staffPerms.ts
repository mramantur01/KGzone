// Staff powers: the owner ticks each one separately for every helper (the server checks them on every action)

export type StaffPerm =
  | 'listings' | 'reports' | 'reviews' | 'requests' | 'orders'
  | 'users.roles' | 'users.crown' | 'users.shops' | 'users.block' | 'users.password'
  | 'ads' | 'vip' | 'stats' | 'settings' | 'audit';

export const PERM_GROUPS: { title: string; items: { id: StaffPerm; label: string }[] }[] = [
  {
    title: 'Объявления и порядок',
    items: [
      { id: 'listings', label: 'Проверять объявления: одобрить, отклонить, исправить, удалить' },
      { id: 'reports', label: 'Разбирать жалобы покупателей' },
      { id: 'reviews', label: 'Проверять отзывы о продавцах и о сайте' },
      { id: 'requests', label: 'Работать с заявками «ищу запчасть»' },
      { id: 'orders', label: 'Смотреть заказы и записи в автосервис' },
    ],
  },
  {
    title: 'Люди',
    items: [
      { id: 'users.roles', label: 'Назначать сотрудников и давать им права' },
      { id: 'users.crown', label: 'Давать и снимать корону продавцам' },
      { id: 'users.shops', label: 'Подтверждать магазины ИП / ОсОО' },
      { id: 'users.block', label: 'Блокировать и разблокировать людей' },
      { id: 'users.password', label: 'Сбрасывать пароль' },
    ],
  },
  {
    title: 'Деньги и настройки',
    items: [
      { id: 'ads', label: 'Реклама: цены, заявки, баннеры' },
      { id: 'vip', label: 'VIP-объявления' },
      { id: 'stats', label: 'Статистика сайта' },
      { id: 'settings', label: 'Настройки: Telegram, загрузка каталога, резервная копия' },
      { id: 'audit', label: 'Журнал действий администраторов' },
    ],
  },
];
export const ALL_PERMS: StaffPerm[] = PERM_GROUPS.flatMap((g) => g.items.map((i) => i.id));
export const MODERATOR_PERMS: StaffPerm[] = ['listings', 'reports', 'reviews', 'requests', 'orders'];
export const presetFor = (role: string): StaffPerm[] => (role === 'admin' ? [...ALL_PERMS] : role === 'moderator' ? [...MODERATOR_PERMS] : []);

/** Does the user have at least one of these powers */
export const can = (u: { perms?: string[] } | null | undefined, ...need: StaffPerm[]) => Boolean(u?.perms && need.some((x) => u.perms!.includes(x)));

// Built-in demo listings (src/data/mockData.ts) show how the catalog looks, but their sellers,
// phone numbers and stores are invented. Database listings have UUID ids ("part-3f2a…"),
// demo ones short numeric ids ("car-12", "part-3", "part-12b").
export const isDemoListing = (id: string) => /^(car|part)-\d+[a-z]?$/.test(id);

// Demo listings are hidden automatically once the site has enough real ones
export const HIDE_DEMO_PARTS_AT = 50;
export const HIDE_DEMO_CARS_AT = 30;

/** Paid VIP placement that has not expired yet */
export const isVip = (item: { vipUntil?: string }) => Boolean(item.vipUntil && Date.parse(item.vipUntil) > Date.now());

/** VIP listings first, otherwise keeps the order */
export const vipFirst = <T extends { vipUntil?: string }>(list: T[]) => [...list.filter(isVip), ...list.filter((x) => !isVip(x))];

export const DEMO_NOTICE = 'Это пример объявления: продавец и телефон выдуманы для демонстрации. Связаться нельзя.';

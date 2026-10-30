// Built-in demo listings (src/data/mockData.ts) show how the catalog looks, but their sellers,
// phone numbers and stores are invented. Database listings have UUID ids ("part-3f2a…"),
// demo ones short numeric ids ("car-12", "part-3", "part-12b").
export const isDemoListing = (id: string) => /^(car|part)-\d+[a-z]?$/.test(id);

export const DEMO_NOTICE = 'Это пример объявления: продавец и телефон выдуманы для демонстрации. Связаться нельзя.';

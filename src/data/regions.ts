// All regions of Kyrgyzstan with their towns and main district centres — one list for the whole site
// (sign-up, profile, sell form, region choice in the top bar, catalog filter, car filter, reviews).

export interface KgRegion { name: string; cities: string[] }

export const KG_REGIONS: KgRegion[] = [
  { name: 'г. Бишкек', cities: ['Бишкек'] },
  { name: 'г. Ош', cities: ['Ош'] },
  // Towns, then district centres (all 40 districts), then urban-type settlements and large villages
  { name: 'Чуйская область', cities: ['Токмок', 'Кара-Балта', 'Кант', 'Кемин', 'Шопоков', 'Орловка', 'Каинды', 'Лебединовка', 'Беловодское', 'Сокулук', 'Чуй', 'Ак-Тюз', 'Боролдой', 'Новопавловка', 'Ивановка', 'Военно-Антоновка', 'Панфиловское'] },
  { name: 'Иссык-Кульская область', cities: ['Каракол', 'Балыкчы', 'Чолпон-Ата', 'Теплоключенка', 'Кызыл-Суу', 'Боконбаево', 'Тюп', 'Каджи-Сай', 'Пристань-Пржевальск', 'Энильчек', 'Ак-Шыйрак', 'Ананьево', 'Бостери'] },
  { name: 'Нарынская область', cities: ['Нарын', 'Баетов', 'Ат-Башы', 'Чаек', 'Кочкор', 'Мин-Куш'] },
  { name: 'Таласская область', cities: ['Талас', 'Бакай-Ата', 'Кызыл-Адыр', 'Покровка'] },
  { name: 'Джалал-Абадская область', cities: ['Джалал-Абад', 'Таш-Кумыр', 'Майлуу-Суу', 'Кара-Куль', 'Кок-Жангак', 'Кочкор-Ата', 'Кербен', 'Ала-Бука', 'Базар-Коргон', 'Масы', 'Сузак', 'Казарман', 'Токтогул', 'Каныш-Кыя', 'Шамалды-Сай', 'Кызыл-Джар', 'Шекафтар'] },
  { name: 'Ошская область', cities: ['Узген', 'Кара-Суу', 'Ноокат', 'Араван', 'Гульча', 'Кара-Кулжа', 'Дароот-Коргон', 'Сары-Таш'] },
  { name: 'Баткенская область', cities: ['Баткен', 'Кызыл-Кия', 'Сулюкта', 'Исфана', 'Кадамжай', 'Айдаркен'] },
];

/** Every town, Bishkek and Osh first */
export const KG_CITIES: string[] = KG_REGIONS.flatMap((r) => r.cities);

/** A region chosen in a filter is stored as this prefix + region name */
export const REGION_PREFIX = 'обл:';

/** Does a place («Каракол», «г. Каракол, ул. …») belong to the chosen city or region? */
export function placeMatches(choice: string, ...places: (string | undefined)[]): boolean {
  if (!choice) return true;
  const text = places.filter(Boolean).join(' ').toLowerCase();
  // Whole name only: «Кочкор» must not match «Кочкор-Ата», «Ош» must not match «Кош-Дөбө»
  const has = (name: string) => {
    const n = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^а-яёa-z0-9-])${n}($|[^а-яёa-z0-9-])`, 'i').test(text);
  };
  if (choice.startsWith(REGION_PREFIX)) {
    const region = KG_REGIONS.find((r) => r.name === choice.slice(REGION_PREFIX.length));
    return !!region && region.cities.some(has);
  }
  // Markets and other free names keep the old «contains» match
  return KG_CITIES.includes(choice) ? has(choice) : text.includes(choice.toLowerCase());
}

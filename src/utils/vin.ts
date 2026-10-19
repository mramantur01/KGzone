// Offline VIN decoding: manufacturer (WMI, first 3 characters) and model year (10th character).
// This is only what the VIN standard itself encodes. Exact model, engine and part numbers
// require a VIN catalog API, which is not connected yet.
// Japanese domestic-market cars usually have a frame number (e.g. "NZE141-1234567") instead of a VIN.

const WMI: [string, string][] = [
  // Longer prefixes first where they matter
  ['JTH', 'Lexus'], ['JTJ', 'Lexus'], ['2T2', 'Lexus'], ['58A', 'Lexus'],
  ['JT', 'Toyota'], ['4T', 'Toyota'], ['5T', 'Toyota'], ['2T', 'Toyota'], ['MR0', 'Toyota'], ['NMT', 'Toyota'], ['SB1', 'Toyota'], ['VNK', 'Toyota'], ['X7M', 'Toyota'],
  ['JN1', 'Nissan'], ['JN8', 'Nissan'], ['1N4', 'Nissan'], ['5N1', 'Nissan'], ['SJN', 'Nissan'], ['JNK', 'Infiniti'], ['5N3', 'Infiniti'],
  ['JHM', 'Honda'], ['JHL', 'Honda'], ['1HG', 'Honda'], ['2HG', 'Honda'], ['5J6', 'Honda'], ['SHH', 'Honda'], ['SHS', 'Honda'], ['19U', 'Acura'], ['JH4', 'Acura'],
  ['JM1', 'Mazda'], ['JM3', 'Mazda'], ['JMZ', 'Mazda'],
  ['JF1', 'Subaru'], ['JF2', 'Subaru'], ['4S3', 'Subaru'], ['4S4', 'Subaru'],
  ['JA3', 'Mitsubishi'], ['JA4', 'Mitsubishi'], ['JMB', 'Mitsubishi'], ['JMY', 'Mitsubishi'], ['MMB', 'Mitsubishi'],
  ['JS2', 'Suzuki'], ['JS3', 'Suzuki'], ['TSM', 'Suzuki'],
  ['KMH', 'Hyundai'], ['KM8', 'Hyundai'], ['5NP', 'Hyundai'], ['5NM', 'Hyundai'], ['TMA', 'Hyundai'], ['Z94', 'Hyundai'], ['KMT', 'Genesis'],
  ['KNA', 'Kia'], ['KND', 'Kia'], ['KNM', 'Renault Samsung'], ['5XY', 'Kia'], ['U5Y', 'Kia'], ['XWE', 'Kia'], ['Z94K', 'Kia'],
  ['KL1', 'Chevrolet'], ['KLA', 'Daewoo'], ['XUU', 'Chevrolet'], ['XWB', 'Chevrolet'], ['1G1', 'Chevrolet'], ['1GN', 'Chevrolet'], ['3GN', 'Chevrolet'], ['XZ', 'Chevrolet'],
  ['WBA', 'BMW'], ['WBS', 'BMW'], ['WBX', 'BMW'], ['5UX', 'BMW'], ['X4X', 'BMW'],
  ['WDB', 'Mercedes-Benz'], ['WDD', 'Mercedes-Benz'], ['WDC', 'Mercedes-Benz'], ['W1K', 'Mercedes-Benz'], ['W1N', 'Mercedes-Benz'], ['4JG', 'Mercedes-Benz'], ['W1V', 'Mercedes-Benz'],
  ['WAU', 'Audi'], ['WA1', 'Audi'], ['TRU', 'Audi'],
  ['WVW', 'Volkswagen'], ['WVG', 'Volkswagen'], ['WV1', 'Volkswagen'], ['WV2', 'Volkswagen'], ['3VW', 'Volkswagen'], ['1VW', 'Volkswagen'], ['XW8', 'Volkswagen'],
  ['WP0', 'Porsche'], ['WP1', 'Porsche'],
  ['SAL', 'Land Rover'], ['SAJ', 'Jaguar'],
  ['YV1', 'Volvo'], ['YV4', 'Volvo'],
  ['VF1', 'Renault'], ['X7L', 'Renault'], ['VF3', 'Peugeot'], ['VF7', 'Citroën'],
  ['XTA', 'LADA'], ['XTT', 'УАЗ'], ['X96', 'ГАЗ'],
  ['5YJ', 'Tesla'], ['7SA', 'Tesla'], ['LRW', 'Tesla'], ['XP7', 'Tesla'],
  ['LGX', 'BYD'], ['LC0', 'BYD'], ['L6T', 'Geely'], ['LB3', 'Geely'], ['LVV', 'Chery'], ['LVT', 'Chery'], ['LGW', 'Haval'], ['LFV', 'Volkswagen'], ['LSV', 'Volkswagen'],
  ['LVG', 'Toyota'], ['LFM', 'Toyota'], ['LHG', 'Honda'], ['LVH', 'Honda'], ['LBV', 'BMW'], ['LE4', 'Mercedes-Benz'],
  ['LLV', 'Zeekr'], ['LW4', 'Li Auto'], ['LGB', 'Nissan'], ['LDC', 'Dongfeng'], ['LZW', 'Wuling'], ['LS5', 'Changan'],
  ['1FA', 'Ford'], ['1FM', 'Ford'], ['1FT', 'Ford'], ['WF0', 'Ford'], ['X9F', 'Ford'],
  ['1C4', 'Jeep'], ['1J4', 'Jeep'], ['1J8', 'Jeep'], ['ZAC', 'Jeep'],
];

const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

export interface VinInfo {
  vin: string;
  brand: string | null;
  year: number | null;
  /** WMI country/region letter for display */
  region: string | null;
}

const REGION: Record<string, string> = {
  J: 'Япония', K: 'Корея', L: 'Китай', W: 'Германия', S: 'Великобритания', Y: 'Швеция', V: 'Франция/Испания',
  Z: 'Италия', X: 'Россия/СНГ', T: 'Чехия/Венгрия', U: 'Румыния/Словакия', '1': 'США', '4': 'США', '5': 'США', '2': 'Канада', '3': 'Мексика', '7': 'США', M: 'Индия/Таиланд', N: 'Турция',
};

export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function decodeVin(raw: string): VinInfo | null {
  const vin = raw.toUpperCase().replace(/[\s-]/g, '');
  if (!VIN_PATTERN.test(vin)) return null;
  const brand = WMI.filter(([p]) => vin.startsWith(p)).sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? null;
  const idx = YEAR_CODES.indexOf(vin[9]);
  let year: number | null = null;
  if (idx >= 0) {
    // The year code repeats every 30 years; pick the latest cycle that is not in the future
    const maxYear = new Date().getFullYear() + 1;
    year = 2010 + idx;
    while (year > maxYear) year -= 30;
  }
  return { vin, brand, year, region: REGION[vin[0]] ?? null };
}

// Minimal CSV reader for catalog import: auto-detects ";" / "," / tab, handles quotes and a UTF-8 BOM.
// Excel: "Файл → Сохранить как → CSV UTF-8 (разделитель — запятая)" or the semicolon variant.

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// Column headers we understand (Russian or the export's English names)
const HEADER_MAP: Record<string, string> = {
  sku: 'sku', 'артикул продавца': 'sku', 'код': 'sku', 'код товара': 'sku',
  title: 'title', 'название': 'title', 'наименование': 'title',
  category: 'category', 'категория': 'category',
  brand: 'brand', 'марка': 'brand', 'марка авто': 'brand',
  model: 'model', 'модель': 'model',
  generation: 'generation', 'поколение': 'generation', 'кузов': 'generation',
  partnumber: 'partNumber', 'oem': 'partNumber', 'oem номер': 'partNumber', 'oem-номер': 'partNumber', 'номер': 'partNumber', 'артикул': 'partNumber',
  crossnumbers: 'crossNumbers', 'кросс-номера': 'crossNumbers', 'кросс номера': 'crossNumbers', 'аналоги': 'crossNumbers',
  manufacturer: 'manufacturer', 'производитель': 'manufacturer', 'бренд': 'manufacturer',
  condition: 'condition', 'состояние': 'condition',
  pricekgs: 'priceKgs', 'цена': 'priceKgs', 'цена сом': 'priceKgs', 'цена, сом': 'priceKgs',
  oldpricekgs: 'oldPriceKgs', 'старая цена': 'oldPriceKgs', 'цена до скидки': 'oldPriceKgs',
  stockcount: 'stockCount', 'количество': 'stockCount', 'остаток': 'stockCount', 'кол-во': 'stockCount',
  warehouseid: 'warehouseId', 'склад': 'warehouseId',
  description: 'description', 'описание': 'description',
  images: 'images', 'фото': 'images', 'фото (ссылки)': 'images',
};

const NUMBER_FIELDS = ['priceKgs', 'oldPriceKgs', 'stockCount'];

const CONDITION_MAP: Record<string, string> = {
  'новая': 'Новый', 'новый': 'Новый', 'new': 'Новый', 'оригинал': 'Новый (Оригинал)', 'новая оригинал': 'Новый (Оригинал)',
  'б/у': 'Б/У с разбора', 'бу': 'Б/У с разбора', 'used': 'Б/У с разбора', 'контрактная': 'Б/у (Контрактный)', 'контракт': 'Б/у (Контрактный)',
  'дубликат': 'Дубликат (OEM)', 'аналог': 'Дубликат (OEM)', 'восстановленная': 'Восстановленная',
};

export interface ImportResult {
  rows: Record<string, unknown>[];
  unknownHeaders: string[];
  missingRequired: string[];
}

/** Turns CSV rows into part objects; warehouse names are matched to warehouse ids */
export function rowsToParts(table: string[][], warehouses: { id: string; name: string }[]): ImportResult {
  const [header, ...body] = table;
  const keys = (header || []).map((h) => HEADER_MAP[h.trim().toLowerCase().replace(/\s+/g, ' ')] || HEADER_MAP[h.trim().toLowerCase().replace(/\s+/g, '')] || '');
  const unknownHeaders = (header || []).filter((_, i) => !keys[i]).map((h) => h.trim()).filter(Boolean);
  const missingRequired = ['title', 'brand', 'partNumber', 'priceKgs'].filter((k) => !keys.includes(k));
  const rows = body.map((cells) => {
    const r: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      if (!k) return;
      let v: unknown = (cells[i] ?? '').trim();
      if (NUMBER_FIELDS.includes(k)) v = String(v).replace(/\s/g, '').replace(',', '.');
      if (k === 'condition') v = CONDITION_MAP[String(v).toLowerCase()] || v;
      if (k === 'images') v = String(v).split(/[\s,;]+/).filter(Boolean);
      if (k === 'warehouseId' && v) {
        const w = warehouses.find((x) => x.id === v || x.name.toLowerCase() === String(v).toLowerCase());
        v = w?.id || '';
      }
      r[k] = v;
    });
    return r;
  });
  return { rows, unknownHeaders, missingRequired };
}

export const IMPORT_TEMPLATE =
  '﻿Артикул продавца;Название;Категория;Марка;Модель;Поколение;OEM;Кросс-номера;Производитель;Состояние;Цена;Старая цена;Количество;Склад;Описание;Фото (ссылки)\r\n' +
  'A-001;Фильтр масляный;Масла и фильтры;Toyota;Camry;XV70;90915-YZZE1;W68/3, OC 217;Toyota;новая;650;;20;;Оригинал;\r\n';

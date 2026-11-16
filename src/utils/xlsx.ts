// Reads the first sheet of an Excel .xlsx file in the browser (no library): an .xlsx file is a zip
// archive of XML files. Returns rows of cell texts, like parseCsv.
import { parseCsv, readCsvFile } from './csv';

const td = new TextDecoder();

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Files of a zip archive: name -> loader of its content */
function zipEntries(buf: ArrayBuffer): Map<string, () => Promise<Uint8Array>> {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('bad zip');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, () => Promise<Uint8Array>>();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    out.set(name, async () => {
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const data = bytes.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      throw new Error('unsupported zip method');
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const byTag = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));

/** Column letters of a cell reference ("BC12" -> 54) */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Text of a shared/inline string, without phonetic hints */
const richText = (el: Element) => byTag(el, 't').filter((t) => (t.parentElement?.localName || '') !== 'rPh').map((t) => t.textContent || '').join('');

export async function readXlsx(file: File): Promise<string[][]> {
  const zip = zipEntries(await file.arrayBuffer());
  const read = async (name: string) => { const f = zip.get(name); return f ? td.decode(await f()) : ''; };

  // First sheet of the workbook
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = xml(await read('xl/workbook.xml'));
  const firstSheet = byTag(wb, 'sheet')[0];
  const rid = firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || firstSheet?.getAttribute('r:id');
  if (rid) {
    const rel = byTag(xml(await read('xl/_rels/workbook.xml.rels')), 'Relationship').find((r) => r.getAttribute('Id') === rid);
    const target = rel?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  if (!zip.has(sheetPath)) throw new Error('no sheet');

  const shared = zip.has('xl/sharedStrings.xml') ? byTag(xml(await read('xl/sharedStrings.xml')), 'si').map(richText) : [];
  const sheet = xml(await read(sheetPath));
  const rows: string[][] = [];
  for (const r of byTag(sheet, 'row')) {
    const row: string[] = [];
    for (const c of byTag(r, 'c')) {
      const ref = c.getAttribute('r');
      const idx = ref ? colIndex(ref) : row.length;
      const type = c.getAttribute('t');
      const v = byTag(c, 'v')[0]?.textContent ?? '';
      let text = v;
      if (type === 's') text = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') text = byTag(c, 'is')[0] ? richText(byTag(c, 'is')[0]) : '';
      else if (!type || type === 'n') text = v && /^-?\d+(\.\d+)?(E[-+]?\d+)?$/i.test(v) ? String(Number(v)) : v;
      while (row.length < idx) row.push('');
      row[idx] = text;
    }
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
}

/** Price list file chosen by a seller: Excel (.xlsx) or CSV. Throws an error with a message for the seller. */
export async function readPriceFile(file: File): Promise<string[][]> {
  if (/\.xls$/i.test(file.name)) throw new Error('Это старый формат Excel (.xls). Откройте файл в Excel и сохраните как «Книга Excel (.xlsx)».');
  if (file.size > 5_000_000) throw new Error('Файл больше 5 МБ. Разделите его на части.');
  if (/\.xlsx$/i.test(file.name)) {
    try { return await readXlsx(file); }
    catch { throw new Error('Не удалось прочитать файл Excel. Сохраните его заново как «Книга Excel (.xlsx)» и попробуйте ещё раз.'); }
  }
  return parseCsv(await readCsvFile(file));
}

export const PRICE_FILE_ACCEPT = '.xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

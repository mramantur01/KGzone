import React, { useState } from 'react';
import { Upload, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { importMyParts } from '../../api/myListings';
import { IMPORT_TEMPLATE, rowsToParts } from '../../utils/csv';
import { PRICE_FILE_ACCEPT, readPriceFile } from '../../utils/xlsx';

type Result = { created: number; updated: number; errors: { row: number; error: string }[]; noPhoto: number; moderation: string };

// Seller uploads a whole price list from Excel (.xlsx) or CSV instead of adding parts one by one
export const MyImportPanel: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [preview, setPreview] = useState<ReturnType<typeof rowsToParts> | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const readFile = async (file?: File) => {
    setError(null); setResult(null); setPreview(null);
    if (!file) return;
    let table: string[][];
    try { table = await readPriceFile(file); } catch (e: any) { setError(e.message); return; }
    setFileName(file.name);
    if (table.length < 2) { setError('В файле нет строк с товарами'); return; }
    setPreview(rowsToParts(table, []));
  };

  const upload = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    const total: Result = { created: 0, updated: 0, errors: [], noPhoto: 0, moderation: 'pending' };
    try {
      for (let i = 0; i < preview.rows.length; i += 500) {
        const r = await importMyParts(preview.rows.slice(i, i + 500));
        total.created += r.created; total.updated += r.updated; total.noPhoto = r.noPhoto; total.moderation = r.moderation;
        total.errors.push(...r.errors.map((e) => ({ ...e, row: e.row + i })));
      }
      setResult(total);
      setPreview(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const template = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kgzone-shablon-praisa.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div>
        <h1 className="text-xl font-black text-slate-900">Загрузить прайс</h1>
        <p className="text-sm text-slate-600 mt-1">Добавьте сразу сотни товаров из Excel. Если товар с таким же «Артикулом продавца» уже есть, обновятся цена и количество.</p>
      </div>

      <ol className="text-sm text-slate-700 space-y-2 list-decimal pl-5">
        <li>
          Скачайте шаблон и заполните его в Excel. Обязательные колонки: <b>Название, Марка, OEM, Цена</b>. Укажите и <b>Количество</b> — товары с нулём не показываются.
          <button type="button" onClick={template} className="ml-2 text-[#1d6fb8] hover:underline cursor-pointer inline-flex items-center gap-1"><Download size={13} />Скачать шаблон</button>
        </li>
        <li>Сохраните файл и выберите его ниже — подойдёт обычный файл Excel (.xlsx) или CSV. Фото можно добавить позже, с телефона — товары без фото скрыты, пока их нет.</li>
      </ol>

      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1d6fb8] hover:bg-sky-50/40 cursor-pointer text-center">
        <FileSpreadsheet size={28} className="text-slate-400" />
        <span className="font-bold text-slate-800">{fileName || 'Выбрать файл Excel'}</span>
        <span className="text-xs text-slate-500">до 5 МБ</span>
        <input type="file" accept={PRICE_FILE_ACCEPT} className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
      </label>

      {preview && (
        <div className="text-sm space-y-2">
          <div>Найдено товаров: <b>{preview.rows.length}</b></div>
          {preview.missingRequired.length > 0 && <div className="text-red-600">Нет обязательных колонок: {preview.missingRequired.join(', ')}</div>}
          {preview.unknownHeaders.length > 0 && <div className="text-amber-700">Эти колонки будут пропущены: <span data-no-i18n>{preview.unknownHeaders.join(', ')}</span></div>}
          <button type="button" onClick={upload} disabled={busy || preview.missingRequired.length > 0} className="px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}<span>Загрузить {preview.rows.length} товаров</span>
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {result && (
        <div className="text-sm p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
          <div>Добавлено: <b>{result.created}</b>, обновлено: <b>{result.updated}</b>, с ошибками: <b>{result.errors.length}</b>.</div>
          <div>{result.noPhoto > 0 ? 'Товары сохранены. Товары с фото уже на сайте.' : 'Товары опубликованы на сайте.'}</div>
          {result.noPhoto > 0 && <div className="text-amber-700 font-semibold">Без фото: {result.noPhoto}. Они появятся на сайте сразу, как только вы добавите фото в «Моих объявлениях».</div>}
          {result.errors.slice(0, 20).map((e) => <div key={e.row} className="text-red-600">Строка {e.row}: {e.error}</div>)}
          <button type="button" onClick={onDone} className="mt-1 text-[#1d6fb8] hover:underline font-bold cursor-pointer">Перейти к моим объявлениям →</button>
        </div>
      )}
    </div>
  );
};

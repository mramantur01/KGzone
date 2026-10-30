import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Upload, Download, Trash2, Plus, RefreshCw } from 'lucide-react';
import {
  ROLE_LABELS, ROLE_DESCRIPTIONS, addStaff, changeStaffRole, downloadCompanyExport, getCompanyAudit, getCompanyStats,
  importCompanyRows, leaveCompany, listCompanyOrders, listStaff, removeStaff, saveWarehouses, setCompanyOrderStatus,
  type CompanyInfo, type StaffMember, type StaffRole, type Warehouse,
} from '../../api/company';
import { formatPhone } from '../../api/auth';
import { IMPORT_TEMPLATE, parseCsv, readCsvFile, rowsToParts } from '../../utils/csv';
import { CompanyCatalog } from './CompanyCatalog';

type Tab = 'overview' | 'catalog' | 'import' | 'warehouses' | 'orders' | 'staff' | 'audit';

const card = 'p-4 rounded-2xl bg-white border border-slate-200';
const ACTION_LABELS: Record<string, string> = {
  'staff-add': 'Добавил сотрудника', 'staff-role': 'Изменил роль сотрудника', 'staff-remove': 'Удалил сотрудника',
  warehouses: 'Изменил склады', 'part-create': 'Добавил товар', 'part-edit': 'Изменил товар', import: 'Импорт товаров', export: 'Экспорт каталога',
  'order-status': 'Изменил статус заказа', 'bulk-price': 'Массово изменил цены', 'bulk-discount': 'Установил скидку', 'bulk-clearDiscount': 'Убрал скидку',
  'bulk-stock': 'Массово изменил остатки', 'bulk-warehouse': 'Переместил товары на склад', 'bulk-archive': 'Отправил товары в архив',
  'bulk-activate': 'Опубликовал товары', 'bulk-sold': 'Отметил товары проданными', 'bulk-delete': 'Удалил товары',
};

export const CompanyCabinet: React.FC<{ info: CompanyInfo; onChanged: () => void; onOpenMessages: () => void }> = ({ info, onChanged, onOpenMessages }) => {
  const can = (p: string) => info.permissions.includes(p as any);
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Обзор', show: true },
    { id: 'catalog', label: 'Каталог товаров', show: true },
    { id: 'import', label: 'Импорт и экспорт', show: can('import') || can('export') },
    { id: 'warehouses', label: 'Склады', show: can('warehouses') },
    { id: 'orders', label: 'Заказы', show: can('orders.view') },
    { id: 'staff', label: 'Сотрудники', show: can('staff') },
    { id: 'audit', label: 'Журнал действий', show: can('audit') },
  ];
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-2`}>
        <div>
          <h2 className="text-lg font-black text-slate-900" data-no-i18n>{info.company.name}</h2>
          <div className="text-xs text-slate-500">
            Ваша роль: <b>{ROLE_LABELS[info.role]}</b> · ИНН <span className="font-mono" data-no-i18n>{info.company.inn}</span>
            {info.company.status === 'verified' ? ' · Проверенная компания — товары публикуются сразу' : ' · Компания не подтверждена — товары проходят модерацию'}
          </div>
        </div>
        {info.role !== 'owner' && (
          <button type="button" onClick={async () => { if (confirm('Покинуть компанию? Доступ к её кабинету пропадёт.')) { await leaveCompany(); onChanged(); } }} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer">
            Покинуть компанию
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${tab === t.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            {t.label}
          </button>
        ))}
        {can('messages') && (
          <button type="button" onClick={onOpenMessages} className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-100">Сообщения покупателей</button>
        )}
      </div>

      {tab === 'overview' && <Overview info={info} />}
      {tab === 'catalog' && <CompanyCatalog info={info} />}
      {tab === 'import' && <ImportExport info={info} />}
      {tab === 'warehouses' && <Warehouses info={info} onChanged={onChanged} />}
      {tab === 'orders' && <Orders canEdit={can('orders')} />}
      {tab === 'staff' && <Staff />}
      {tab === 'audit' && <Audit />}
    </div>
  );
};

const Overview: React.FC<{ info: CompanyInfo }> = ({ info }) => {
  const [s, setS] = useState<any>(null);
  useEffect(() => { getCompanyStats().then(setS).catch(() => setS(false)); }, []);
  if (s === null) return <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!s) return <p className={card}>Не удалось загрузить статистику</p>;
  const tiles: [string, string | number][] = [
    ['Опубликовано', s.listings.active],
    ['На модерации', s.listings.pending],
    ['Нет в наличии', s.listings.outOfStock],
    ['В архиве', s.listings.archived],
    ['Просмотры', s.views],
    ['Обращения', s.contacts],
    ['Конверсия в обращение', `${s.conversion}%`],
  ];
  if (s.orders) {
    tiles.push(['Заказы в работе', s.orders.open], ['Выполнено заказов', s.orders.completed]);
    if (s.orders.revenueKgs !== undefined) tiles.push(['Выручка (выполненные), сом', s.orders.revenueKgs.toLocaleString('ru-RU')]);
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className={card}>
            <div className="text-[11px] text-slate-500 font-bold">{label}</div>
            <div className="text-xl font-black text-slate-900">{value}</div>
          </div>
        ))}
      </div>
      <div className={card}>
        <div className="font-bold text-sm text-slate-900 mb-2">Самые просматриваемые товары</div>
        {s.top.length === 0 ? <p className="text-xs text-slate-500">Пока нет данных</p> : (
          <table className="w-full text-xs">
            <tbody>
              {s.top.map((t: any) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-1.5" data-no-i18n>{t.title}</td>
                  <td className="py-1.5 text-right text-slate-500 whitespace-nowrap">👁 {t.views} · ☎ {t.contacts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Размещение товаров сейчас бесплатное, комиссии нет. Платные тарифы и продвижение появятся после подключения онлайн-оплаты.
        {info.company.status !== 'verified' ? ' Подтвердите компанию в разделе «Компания», чтобы товары публиковались без ожидания модерации.' : ''}
      </p>
    </div>
  );
};

const ImportExport: React.FC<{ info: CompanyInfo }> = ({ info }) => {
  const can = (p: string) => info.permissions.includes(p as any);
  const [preview, setPreview] = useState<ReturnType<typeof rowsToParts> | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: { row: number; error: string }[]; moderation: string; noPhoto: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readFile = async (file: File | undefined) => {
    setResult(null); setError(null); setPreview(null);
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) { setError('Сохраните файл в Excel как «CSV UTF-8» (Файл → Сохранить как) и загрузите его.'); return; }
    if (file.size > 5_000_000) { setError('Файл больше 5 МБ. Разделите его на части.'); return; }
    setFileName(file.name);
    const table = parseCsv(await readCsvFile(file));
    if (table.length < 2) { setError('В файле нет строк с товарами'); return; }
    setPreview(rowsToParts(table, info.company.warehouses));
  };

  const doImport = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    const total = { created: 0, updated: 0, errors: [] as { row: number; error: string }[], moderation: 'pending', noPhoto: 0 };
    try {
      for (let i = 0; i < preview.rows.length; i += 500) {
        const r = await importCompanyRows(preview.rows.slice(i, i + 500) as Record<string, string>[]);
        total.created += r.created; total.updated += r.updated; total.moderation = r.moderation; total.noPhoto = r.noPhoto || 0;
        total.errors.push(...r.errors.map((e) => ({ ...e, row: e.row + i })));
      }
      setResult(total);
      setPreview(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    a.download = 'kgzone-shablon-importa.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {can('import') && (
        <div className={`${card} space-y-3`}>
          <div className="font-bold text-sm text-slate-900">Массовая загрузка из Excel / CSV</div>
          <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-0.5">
            <li>Скачайте шаблон и заполните его в Excel (одна строка — один товар).</li>
            <li>Обязательные колонки: Название, Марка, OEM, Цена.</li>
            <li>Сохраните как «CSV UTF-8» и загрузите сюда. Строки с тем же «Артикулом продавца» обновят существующие товары.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadTemplate} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"><Download size={13} />Скачать шаблон</button>
            <label className="px-3 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
              <Upload size={13} />Выбрать файл CSV
              <input type="file" accept=".csv,text/csv,.xlsx,.xls" className="hidden" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {preview && (
            <div className="space-y-2 text-xs">
              <div><b data-no-i18n>{fileName}</b>: строк с товарами — <b>{preview.rows.length}</b></div>
              {preview.missingRequired.length > 0 && <p className="text-red-600">Нет обязательных колонок: {preview.missingRequired.join(', ')}</p>}
              {preview.unknownHeaders.length > 0 && <p className="text-amber-700">Колонки будут пропущены: <span data-no-i18n>{preview.unknownHeaders.join(', ')}</span></p>}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500"><tr><th className="p-1.5 text-left">Название</th><th className="p-1.5 text-left">Марка</th><th className="p-1.5 text-left">OEM</th><th className="p-1.5 text-left">Цена</th><th className="p-1.5 text-left">Кол-во</th></tr></thead>
                  <tbody data-no-i18n>
                    {preview.rows.slice(0, 8).map((r: any, i) => (
                      <tr key={i} className="border-t border-slate-100"><td className="p-1.5">{r.title}</td><td className="p-1.5">{r.brand}</td><td className="p-1.5 font-mono">{r.partNumber}</td><td className="p-1.5">{r.priceKgs}</td><td className="p-1.5">{r.stockCount}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" disabled={busy || preview.missingRequired.length > 0} onClick={doImport} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />}<span>Загрузить {preview.rows.length} товаров</span>
              </button>
            </div>
          )}
          {result && (
            <div className="text-xs p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
              <div>Добавлено: <b>{result.created}</b>, обновлено: <b>{result.updated}</b>, с ошибками: <b>{result.errors.length}</b>.</div>
              <div>{result.moderation === 'approved' ? 'Товары опубликованы.' : 'Товары отправлены на модерацию.'}</div>
              {result.noPhoto > 0 && (
                <div className="text-amber-700 font-semibold">Без фото: {result.noPhoto}. Покупатели их не видят — добавьте фото в разделе «Каталог» (кнопка «Добавить фото»).</div>
              )}
              {result.errors.slice(0, 30).map((e) => <div key={e.row} className="text-red-600">Строка {e.row}: {e.error}</div>)}
            </div>
          )}
        </div>
      )}
      {can('export') && (
        <div className={`${card} flex flex-wrap items-center justify-between gap-2`}>
          <div>
            <div className="font-bold text-sm text-slate-900">Экспорт каталога</div>
            <div className="text-xs text-slate-500">Все товары компании в CSV (открывается в Excel). Этот же файл можно отредактировать и загрузить обратно.</div>
          </div>
          <button type="button" onClick={() => downloadCompanyExport().catch((e) => setError(e.message))} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><Download size={13} />Скачать CSV</button>
        </div>
      )}
    </div>
  );
};

const Warehouses: React.FC<{ info: CompanyInfo; onChanged: () => void }> = ({ info, onChanged }) => {
  const [list, setList] = useState<Warehouse[]>(info.company.warehouses);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setMsg(null);
    try { const r = await saveWarehouses(list); setList(r.warehouses); setMsg('Склады сохранены'); onChanged(); } catch (e: any) { setMsg(e.message); }
  };
  return (
    <div className={`${card} space-y-3`}>
      <div className="font-bold text-sm text-slate-900">Склады и филиалы</div>
      <p className="text-xs text-slate-500">Укажите, где лежит товар — в каталоге можно фильтровать и перемещать товары между складами.</p>
      {list.map((w, i) => (
        <div key={w.id} className="flex flex-col sm:flex-row gap-2">
          <input value={w.name} onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Название (напр. Кудайберген, ряд 7)" maxLength={80} className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg text-sm" />
          <input value={w.address} onChange={(e) => setList((l) => l.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} placeholder="Адрес" maxLength={200} className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg text-sm" />
          <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Удалить склад"><Trash2 size={15} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        {list.length < 20 && <button type="button" onClick={() => setList((l) => [...l, { id: '', name: '', address: '' }])} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"><Plus size={13} />Добавить склад</button>}
        <button type="button" onClick={save} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">Сохранить</button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </div>
  );
};

const Orders: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const [data, setData] = useState<{ orders: any[]; statuses: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const load = useCallback(() => listCompanyOrders().then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <div className="py-10 text-center text-slate-400">{error || <Loader2 className="animate-spin mx-auto" />}</div>;
  const shown = data.orders.filter((o) => !filter || o.status === filter);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 items-center">
        <button type="button" onClick={() => setFilter('')} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${!filter ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'}`}>Все ({data.orders.length})</button>
        {data.statuses.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filter === s ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'}`}>{s} ({data.orders.filter((o) => o.status === s).length})</button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 cursor-pointer" aria-label="Обновить"><RefreshCw size={13} /></button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {shown.length === 0 ? <p className={`${card} text-center text-sm text-slate-500`}>Заказов нет</p> : shown.map((o) => (
        <div key={o.id} className={`${card} !p-3 flex flex-wrap items-center justify-between gap-2 text-xs`}>
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900" data-no-i18n>{o.partTitle}</div>
            <div className="text-slate-500"><span data-no-i18n>{o.orderNumber}</span> · {o.createdAt} · {Number(o.priceKgs || 0).toLocaleString('ru-RU')} сом</div>
            <div className="text-slate-600" data-no-i18n>{o.customerName}, {o.customerPhone} · {o.deliveryType === 'delivery' ? `Доставка: ${o.deliveryAddress}` : 'Самовывоз'}</div>
            {o.comment && <div className="text-slate-400" data-no-i18n>{o.comment}</div>}
          </div>
          {canEdit ? (
            <select value={o.status} onChange={(e) => setCompanyOrderStatus(o.id, e.target.value).then(load).catch((err) => setError(err.message))} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-bold">
              {data.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : <span className="font-bold">{o.status}</span>}
        </div>
      ))}
      <p className="text-[11px] text-slate-400">Когда заказ отмечен «Выполнен», остаток товара уменьшается на 1. Онлайн-оплата и службы доставки не подключены — оплата при получении.</p>
    </div>
  );
};

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('sales_manager');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(() => listStaff().then(setStaff).catch((e) => setMsg({ ok: false, text: e.message })), []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  };
  const roles = (Object.keys(ROLE_LABELS) as StaffRole[]).filter((r) => r !== 'owner');
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); act(() => addStaff(phone, role), 'Сотрудник добавлен'); setPhone(''); }} className={`${card} grid grid-cols-1 sm:grid-cols-4 gap-2 items-end text-xs`}>
        <label className="sm:col-span-2 space-y-1"><span className="font-bold text-slate-700">Телефон сотрудника</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+996 700 123 456" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm" /></label>
        <label className="space-y-1"><span className="font-bold text-slate-700">Роль</span>
          <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white">
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select></label>
        <button type="submit" className="px-3 py-2 rounded-xl bg-[#C8102E] text-white text-sm font-bold cursor-pointer">Добавить</button>
        <p className="sm:col-span-4 text-[11px] text-slate-500">Сотрудник должен сначала зарегистрироваться на KGzone как физическое лицо с этим номером. {ROLE_DESCRIPTIONS[role]}.</p>
      </form>
      {msg && <p className={`text-xs rounded-lg px-3 py-2 border ${msg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{msg.text}</p>}
      {staff.length === 0 ? <p className={`${card} text-center text-sm text-slate-500`}>Сотрудников пока нет</p> : staff.map((s) => (
        <div key={s.id} className={`${card} !p-3 flex flex-wrap items-center justify-between gap-2 text-xs`}>
          <div>
            <div className="font-bold text-sm text-slate-900" data-no-i18n>{s.name}</div>
            <div className="text-slate-500"><span data-no-i18n>{s.phone ? formatPhone(s.phone) : ''}</span> · с {new Date(s.createdAt).toLocaleDateString('ru-RU')}{s.blocked ? ' · заблокирован администрацией сайта' : ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={s.role} onChange={(e) => act(() => changeStaffRole(s.id, e.target.value as StaffRole), 'Роль изменена')} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-bold">
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button type="button" onClick={() => { if (confirm(`Удалить ${s.name} из сотрудников?`)) act(() => removeStaff(s.id), 'Сотрудник удалён'); }} className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Удалить сотрудника"><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <div className={`${card} text-xs text-slate-600 space-y-1`}>
        <div className="font-bold text-slate-900">Права ролей</div>
        {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => <div key={r}><b>{ROLE_LABELS[r]}:</b> {ROLE_DESCRIPTIONS[r]}</div>)}
        <div className="text-slate-400">Права проверяются на сервере. Банковские реквизиты видят только владелец и бухгалтер.</div>
      </div>
    </div>
  );
};

const Audit: React.FC = () => {
  const [entries, setEntries] = useState<any[] | null>(null);
  useEffect(() => { getCompanyAudit().then(setEntries).catch(() => setEntries([])); }, []);
  if (!entries) return <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  return (
    <div className={`${card} !p-0 divide-y divide-slate-100 text-xs`}>
      {entries.length === 0 && <p className="p-4 text-slate-500">Пока пусто</p>}
      {entries.map((a) => (
        <div key={a.id} className="p-2.5 flex flex-wrap gap-x-3 text-slate-600">
          <span className="text-slate-400">{new Date(a.at).toLocaleString('ru-RU')}</span>
          <span className="font-bold" data-no-i18n>{a.actorName}</span>
          <span>{ACTION_LABELS[a.action] || a.action}</span>
          {a.details && Object.keys(a.details).length > 0 && <span className="text-slate-400 font-mono" data-no-i18n>{JSON.stringify(a.details)}</span>}
        </div>
      ))}
    </div>
  );
};

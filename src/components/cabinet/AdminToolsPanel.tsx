import React, { useEffect, useMemo, useState } from 'react';
import { Send, Download, Upload, Loader2, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';
import { listUsers, type AdminUser } from '../../api/myListings';
import { parseCsv, readCsvFile, rowsToParts, IMPORT_TEMPLATE } from '../../utils/csv';
import { formatPhone } from '../../api/auth';

const card = 'p-4 rounded-2xl bg-white border border-slate-200 text-sm space-y-3';
const btn = 'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60';

interface BotStatus { configured: boolean; username?: string; webhookOk?: boolean; lastError?: string | null }

// Telegram bot: shows whether it is configured and connects the webhook in one click
const TelegramBotCard: React.FC = () => {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => call<BotStatus>('/api/admin/telegram', {}, true).then(setStatus).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const setup = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ username: string }>('/api/admin/telegram/setup', { method: 'POST' }, true);
      setMsg(`Бот @${r.username} подключён к сайту.`);
      load();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-bold text-slate-900"><Send size={15} className="text-sky-500" />Telegram-бот KGzone</div>
      {!status ? <p className="text-xs text-slate-400">Загрузка...</p> : !status.configured ? (
        <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
          <li>В Telegram откройте <b>@BotFather</b>, отправьте <code>/newbot</code> и придумайте имя, например «KGzone уведомления».</li>
          <li>BotFather пришлёт токен. Добавьте его в Vercel как переменную <code>TELEGRAM_BOT_TOKEN</code> (никому его не показывайте).</li>
          <li>После обновления сайта вернитесь сюда и нажмите «Подключить бота к сайту».</li>
        </ol>
      ) : (
        <div className="text-xs text-slate-600 space-y-1">
          <div>Бот: <b data-no-i18n>@{status.username}</b> · {status.webhookOk ? <span className="text-emerald-700 font-bold">подключён к сайту</span> : <span className="text-amber-700 font-bold">не подключён к сайту</span>}</div>
          {status.lastError && <div className="text-red-600" data-no-i18n>{status.lastError}</div>}
          <div>Чтобы получать уведомления администратора и резервные копии, подключите Telegram в своём «Профиле».</div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {status?.configured && (
          <button type="button" onClick={setup} disabled={busy} className={`${btn} bg-sky-500 hover:bg-sky-600 text-white`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{status.webhookOk ? 'Переподключить бота' : 'Подключить бота к сайту'}</span>
          </button>
        )}
        <button type="button" onClick={load} className={`${btn} bg-slate-100 hover:bg-slate-200 text-slate-700`}><RefreshCw size={13} /><span>Обновить</span></button>
      </div>
      {msg && <p className="text-xs text-slate-700">{msg}</p>}
    </div>
  );
};

const BackupCard: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await call<unknown>('/api/admin/backup', {}, true);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kgzone-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-bold text-slate-900"><Download size={15} className="text-emerald-600" />Резервная копия базы</div>
      <p className="text-xs text-slate-600">
        Весь сайт (объявления, аккаунты, переписка) одним файлом. Храните его в надёжном месте — в нём есть телефоны пользователей.
        Каждую ночь копия автоматически приходит администраторам, подключившим Telegram.
      </p>
      <button type="button" onClick={download} disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}<span>Скачать копию</span>
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

// Upload a shop's price list on its behalf (onboarding sellers from the market)
const ImportForSellerCard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [preview, setPreview] = useState<ReturnType<typeof rowsToParts> | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { listUsers().then(setUsers).catch(() => setUsers([])); }, []);

  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    if (!q) return [];
    return users.filter((u) => u.name.toLowerCase().includes(q) || (u.company?.name || '').toLowerCase().includes(q) || (digits.length >= 3 && u.phone.includes(digits))).slice(0, 8);
  }, [users, query]);
  const owner = users.find((u) => u.id === ownerId);

  const onFile = async (file?: File) => {
    setResult(null);
    if (!file) return setPreview(null);
    setPreview(rowsToParts(parseCsv(await readCsvFile(file)), []));
  };

  const upload = async () => {
    if (!owner || !preview) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await call<{ created: number; updated: number; noPhoto: number; errors: { row: number; error: string }[] }>(
        '/api/admin/import', { method: 'POST', body: JSON.stringify({ ownerId: owner.id, rows: preview.rows }) }, true);
      setResult(`Готово: новых ${r.created}, обновлено ${r.updated}${r.errors.length ? `, ошибок ${r.errors.length} (строки ${r.errors.slice(0, 10).map((e) => e.row).join(', ')}: ${r.errors[0].error})` : ''}.` +
        (r.noPhoto ? ` Без фото: ${r.noPhoto} — они скрыты, пока продавец не добавит фото в кабинете.` : ''));
      setPreview(null);
    } catch (e: any) { setResult(e.message); } finally { setBusy(false); }
  };

  const template = () => {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kgzone-shablon-zapchastej.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-bold text-slate-900"><Upload size={15} className="text-[#C8102E]" />Загрузить прайс за продавца</div>
      <p className="text-xs text-slate-600">
        Продавец регистрируется сам (или вместе с вами), присылает прайс — вы загружаете его здесь. Фото в прайсе не обязательны: товары без фото скрыты, пока продавец не сфотографирует их в кабинете.
      </p>
      <div>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setOwnerId(''); }} placeholder="Найти продавца: имя, магазин или телефон" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
        {!owner && found.length > 0 && (
          <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100">
            {found.map((u) => (
              <button key={u.id} type="button" onClick={() => { setOwnerId(u.id); setQuery(u.company?.name || u.name); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer" data-no-i18n>
                <b>{u.company?.name || u.name}</b> · {formatPhone(u.phone)} · {u.city}
              </button>
            ))}
          </div>
        )}
        {owner && <p className="text-xs text-emerald-700 mt-1" data-no-i18n>✓ {owner.company?.name || owner.name}, {formatPhone(owner.phone)}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" />
        <button type="button" onClick={template} className="text-xs underline text-slate-600 cursor-pointer">Скачать шаблон (Excel → CSV)</button>
      </div>
      {preview && (
        <div className="text-xs text-slate-600 space-y-1">
          <div>Строк в файле: <b>{preview.rows.length}</b></div>
          {preview.missingRequired.length > 0 && <div className="text-red-600">Нет обязательных колонок: {preview.missingRequired.join(', ')}</div>}
          {preview.unknownHeaders.length > 0 && <div className="text-amber-700">Колонки будут пропущены: <span data-no-i18n>{preview.unknownHeaders.join(', ')}</span></div>}
        </div>
      )}
      <button type="button" onClick={upload} disabled={busy || !owner || !preview || preview.missingRequired.length > 0 || !preview.rows.length} className={`${btn} bg-[#C8102E] hover:bg-[#a60d26] text-white`}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}<span>Загрузить</span>
      </button>
      {result && <p className="text-xs text-slate-700">{result}</p>}
    </div>
  );
};

export const AdminToolsPanel: React.FC = () => (
  <div className="space-y-4">
    <TelegramBotCard />
    <ImportForSellerCard />
    <BackupCard />
  </div>
);

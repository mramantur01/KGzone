import React from 'react';
import { BadgeCheck, FileSpreadsheet, MessageSquare, Search, Store, TrendingUp, Users, Wallet, ChevronDown } from 'lucide-react';

const BENEFITS: { icon: React.ElementType; title: string; text: string }[] = [
  { icon: Wallet, title: 'Бесплатно, без комиссии', text: 'Размещение и продажи — 0 сом. Деньги покупатель платит вам напрямую.' },
  { icon: MessageSquare, title: 'Покупатели пишут вам', text: 'Звонки, WhatsApp, чат на сайте и заказы из корзины — прямо к вам, без посредников.' },
  { icon: FileSpreadsheet, title: 'Весь склад одним файлом', text: 'Загрузите прайс из Excel или дайте ссылку на Google-таблицу — цены и остатки обновятся сами.' },
  { icon: Search, title: 'Заявки «ищу деталь»', text: 'Покупатели оставляют заявки, а вы отправляете свою цену — без звонков и переписки.' },
  { icon: Store, title: 'Своя страница магазина', text: 'Все товары, адрес, контейнер и часы работы по одной ссылке — для Instagram и визиток.' },
  { icon: TrendingUp, title: 'Видно, что ищут', text: 'Сайт показывает, какие запчасти ищут, но не находят — привозите то, что продаётся.' },
  { icon: BadgeCheck, title: 'Значок доверия', text: 'Проверенным продавцам — корона, компаниям — «Официальная компания» и место выше в поиске.' },
  { icon: Users, title: 'Для компаний — CRM', text: 'Клиенты, сделки, сотрудники с ролями, касса, отчёты, счета и накладные.' },
];

const STEPS = [
  ['Зарегистрируйтесь', 'Телефон и пароль — 1 минута. Для компании — название и ИНН.'],
  ['Добавьте запчасти', 'По одной с фото или весь склад из Excel. Мы можем загрузить прайс за вас.'],
  ['Получайте заказы', 'Покупатели звонят, пишут и оформляют заказы. Уведомления — на сайте, в телефон и Telegram.'],
];

const FAQ: [string, string][] = [
  ['Сколько это стоит?', 'Сейчас размещение полностью бесплатное, комиссии с продаж нет.'],
  ['Нужно ли фото каждой детали?', 'Да. На сайте показываются только товары в наличии с вашими фото — покупатели больше доверяют настоящим фото.'],
  ['У меня тысячи позиций, долго заполнять?', 'Нет. Загрузите Excel-файл или ссылку на Google-таблицу — товары добавятся сразу. Фото можно загрузить пачкой, назвав файлы по артикулу.'],
  ['Как получать оплату?', 'Как вы привыкли: наличными, MBANK, О!Деньги или по счёту. Сайт деньги не принимает.'],
  ['Я компания (ОсОО, ИП). Что есть для меня?', 'Бизнес-кабинет: сотрудники с ролями, склады, CRM клиентов, касса, отчёты, счета и накладные, оптовые цены, рассылка клиентам.'],
  ['Как получить корону «Проверенный продавец»?', 'Администрация KGzone проверяет продавца — документы и место продажи. Компании с проверенными документами получают значок «Официальная компания».'],
];

/** Page for sellers: kgzone/prodavcam */
export const SellersLanding: React.FC<{ onRegister: () => void; onOpenParts: () => void }> = ({ onRegister, onOpenParts }) => (
  <div className="bg-slate-50">
    <section className="bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-amber-400 font-bold text-sm uppercase tracking-wide">Для продавцов запчастей</div>
        <h1 className="mt-2 text-3xl sm:text-5xl font-black leading-tight">Продавайте запчасти на KGzone <span className="text-amber-400">бесплатно</span></h1>
        <p className="mt-4 text-neutral-300 max-w-2xl">Кудайберген, Дордой Моторс, Ош, Каракол — покупатели со всего Кыргызстана ищут запчасти здесь. Разместите свой склад за 10 минут.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onRegister} className="px-6 py-3.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white font-black cursor-pointer">Начать продавать — бесплатно</button>
          <button type="button" onClick={onOpenParts} className="px-6 py-3.5 rounded-xl border border-neutral-700 hover:bg-neutral-900 text-white font-bold cursor-pointer">Посмотреть каталог</button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Кыргызча: Тетиктерди KGzone'до акысыз сатыңыз — сатып алуучулар сизге түз чалышат.</p>
      </div>
    </section>

    <section className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-black text-slate-900">Почему KGzone</h2>
      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {BENEFITS.map((b) => (
          <div key={b.title} className="p-4 rounded-2xl bg-white border border-slate-200">
            <b.icon size={22} className="text-[#C8102E]" />
            <div className="mt-2 font-bold text-slate-900">{b.title}</div>
            <p className="mt-1 text-sm text-slate-600">{b.text}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="max-w-5xl mx-auto px-4 pb-10">
      <h2 className="text-2xl font-black text-slate-900">Три шага</h2>
      <ol className="mt-5 grid sm:grid-cols-3 gap-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="p-4 rounded-2xl bg-white border border-slate-200">
            <span className="w-8 h-8 rounded-full bg-amber-400 text-neutral-950 font-black flex items-center justify-center">{i + 1}</span>
            <div className="mt-2 font-bold text-slate-900">{t}</div>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <b>Много товаров и нет времени?</b> Администратор KGzone может сам загрузить ваш Excel-прайс в ваш кабинет — бесплатно. Фото добавите сами, это быстро.
      </div>
    </section>

    <section className="max-w-3xl mx-auto px-4 pb-14">
      <h2 className="text-2xl font-black text-slate-900">Частые вопросы</h2>
      <div className="mt-4 space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group p-4 rounded-2xl bg-white border border-slate-200">
            <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">{q}<ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" /></summary>
            <p className="mt-2 text-sm text-slate-600">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button type="button" onClick={onRegister} className="px-8 py-4 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white font-black text-lg cursor-pointer">Зарегистрироваться и начать продавать</button>
      </div>
    </section>
  </div>
);

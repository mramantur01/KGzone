// Builds static/listovka.html: a printable A4 sheet with two A5 flyers for recruiting sellers at markets.
// The QR code leads straight to the sign-up form. Run: node scripts/flyer/make-flyer.mjs [site-url]
import fs from 'fs';
import QRCode from 'qrcode';

const site = (process.argv[2] || 'https://k-gzone.vercel.app').replace(/\/$/, '');
const target = `${site}/kabinet?register`;
const qr = await QRCode.toString(target, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } });
const host = site.replace(/^https?:\/\//, '');

const flyer = `
<section class="flyer">
  <header>
    <div class="logo">KG<span>zone</span></div>
    <div class="tag">Авторынок Кыргызстана онлайн</div>
  </header>
  <h1>Продаёте запчасти?<br><em>Разместите бесплатно</em></h1>
  <p class="kg">Запчаст сатасызбы? KGzone'го акысыз жайгаштырыңыз</p>
  <div class="body">
    <ul>
      <li><b>0 сом</b> — без оплаты и комиссии</li>
      <li>Покупатели пишут и звонят <b>напрямую вам</b></li>
      <li>Весь склад сразу — одним файлом из Excel (CSV)</li>
      <li>Свой магазин со ссылкой, адресом и контейнером</li>
      <li>Видно, какие запчасти <b>ищут, но не находят</b></li>
      <li>Значок «Проверенный продавец» 👑</li>
    </ul>
    <div class="qr">
      ${qr}
      <div class="scan">Наведите камеру телефона</div>
    </div>
  </div>
  <ol class="steps">
    <li>Сканируйте QR-код</li>
    <li>Зарегистрируйтесь за 1 минуту</li>
    <li>Добавьте запчасти с фото</li>
  </ol>
  <footer>
    <span class="url">${host}</span>
    <span>Кудайберген · Дордой Моторс · Ош · Каракол</span>
  </footer>
</section>`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Листовка KGzone для продавцов</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e2e8f0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  .bar { position: sticky; top: 0; background: #0f172a; color: #fff; padding: 12px 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 14px; z-index: 1; }
  .bar button { background: #fbbf24; color: #0f172a; border: 0; border-radius: 10px; padding: 10px 18px; font-weight: 800; font-size: 15px; cursor: pointer; }
  .sheet { width: 210mm; height: 297mm; margin: 16px auto; background: #fff; display: flex; flex-direction: column; box-shadow: 0 4px 24px rgba(0,0,0,.15); }
  .flyer { height: 148.5mm; padding: 9mm 11mm; display: flex; flex-direction: column; border-bottom: 1px dashed #94a3b8; overflow: hidden; }
  .flyer:last-child { border-bottom: 0; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .logo { font-size: 30px; font-weight: 900; letter-spacing: -1px; color: #C8102E; }
  .logo span { color: #0f172a; }
  .tag { font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  h1 { margin: 4mm 0 1mm; font-size: 27px; line-height: 1.1; }
  h1 em { font-style: normal; color: #C8102E; }
  .kg { margin: 0 0 3mm; font-size: 13px; color: #475569; }
  .body { display: flex; gap: 7mm; align-items: center; flex: 1; }
  ul { margin: 0; padding: 0; list-style: none; flex: 1; font-size: 14.5px; line-height: 1.45; }
  ul li { padding-left: 20px; position: relative; }
  ul li::before { content: '✓'; position: absolute; left: 0; color: #16a34a; font-weight: 900; }
  .qr { width: 44mm; text-align: center; flex-shrink: 0; }
  .qr svg { width: 44mm; height: 44mm; display: block; }
  .scan { font-size: 11px; font-weight: 700; margin-top: 2mm; color: #475569; }
  .steps { display: flex; gap: 3mm; margin: 3mm 0; padding: 0; list-style: none; counter-reset: s; }
  .steps li { flex: 1; background: #fef3c7; border-radius: 8px; padding: 2.5mm 3mm; font-size: 12.5px; font-weight: 700; counter-increment: s; }
  .steps li::before { content: counter(s); display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: #0f172a; color: #fff; font-size: 11px; align-items: center; justify-content: center; margin-right: 5px; }
  footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; border-top: 2px solid #C8102E; padding-top: 2mm; }
  .url { font-size: 17px; font-weight: 900; color: #0f172a; }
  @media print { body { background: #fff; } .bar { display: none; } .sheet { margin: 0; box-shadow: none; } }
  @media screen and (max-width: 820px) { .sheet { transform: scale(.45); transform-origin: top left; margin: 8px; } }
</style>
</head>
<body>
<div class="bar">
  <button onclick="window.print()">🖨 Распечатать</button>
  <span>На одном листе A4 — две листовки. Разрежьте по пунктиру. QR-код ведёт на регистрацию: ${target}</span>
</div>
<div class="sheet">${flyer}${flyer}</div>
</body>
</html>
`;

fs.writeFileSync('static/listovka.html', html);
console.log('static/listovka.html ->', target);

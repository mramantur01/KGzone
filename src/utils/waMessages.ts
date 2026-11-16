// Ready WhatsApp messages to a seller, in the language the buyer uses on the site (RU / KG / EN)
import type { Language } from '../types/car';

const fmt = (n: number) => Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const place = (market?: string, spot?: string) => [market, spot].filter(Boolean).join(', ');

/** "Is this part in stock?" — from the catalog card and the part page */
export function partQuestion(lang: Language, p: { title: string; partNumber: string; priceKgs: number; market?: string; spot?: string; storeName?: string }): string {
  const where = place(p.market, p.spot);
  if (lang === 'kg') {
    return `Саламатсызбы! KGzone сайтынан бул тетикти көрдүм:\n📦 ${p.title} (OEM: ${p.partNumber})\n` +
      (p.storeName ? `🏪 Дүкөн: ${p.storeName}\n` : '') + (where ? `📍 ${where}\n` : '') +
      `💰 Баасы: ${fmt(p.priceKgs)} сом\n\nАзыр барбы? Барып көрсөм болобу?`;
  }
  if (lang === 'en') {
    return `Hello! I saw this part on KGzone:\n📦 ${p.title} (OEM: ${p.partNumber})\n` +
      (p.storeName ? `🏪 Shop: ${p.storeName}\n` : '') + (where ? `📍 ${where}\n` : '') +
      `💰 Price: ${fmt(p.priceKgs)} som\n\nIs it in stock? Can I come and see it?`;
  }
  return `Здравствуйте! Увидел на KGzone эту запчасть:\n📦 ${p.title} (OEM: ${p.partNumber})\n` +
    (p.storeName ? `🏪 Магазин: ${p.storeName}\n` : '') + (where ? `📍 ${where}\n` : '') +
    `💰 Цена: ${fmt(p.priceKgs)} сом\n\nЕсть в наличии? Можно подъехать посмотреть?`;
}

/** Order of one part with delivery and payment */
export function partOrder(lang: Language, o: { title: string; partNumber: string; priceKgs: number; priceUsd: number; where: string; delivery: string; payment: string }): string {
  if (lang === 'kg') {
    return `Саламатсызбы! KGzone аркылуу буйрутма бергим келет:\n\n📦 Товар: ${o.title}\n🔢 OEM: ${o.partNumber}\n📍 ${o.where}\n` +
      `💰 Баасы: ${fmt(o.priceKgs)} сом (~$${o.priceUsd})\n🚚 Жеткирүү: ${o.delivery}\n💳 Төлөм: ${o.payment}\n\nСураныч, бар экенин тастыктап бериңиз!`;
  }
  if (lang === 'en') {
    return `Hello! I would like to order via KGzone:\n\n📦 Item: ${o.title}\n🔢 OEM: ${o.partNumber}\n📍 ${o.where}\n` +
      `💰 Price: ${fmt(o.priceKgs)} som (~$${o.priceUsd})\n🚚 Delivery: ${o.delivery}\n💳 Payment: ${o.payment}\n\nPlease confirm it is in stock!`;
  }
  return `Здравствуйте! Хочу заказать через KGzone:\n\n📦 Товар: ${o.title}\n🔢 OEM: ${o.partNumber}\n📍 ${o.where}\n` +
    `💰 Цена: ${fmt(o.priceKgs)} сом (~$${o.priceUsd})\n🚚 Доставка: ${o.delivery}\n💳 Оплата: ${o.payment}\n\nПодтвердите, пожалуйста, что есть в наличии!`;
}

/** Question about a car listing */
export function carQuestion(lang: Language, c: { title: string; year: number; priceUsd: string }): string {
  if (lang === 'kg') return `Саламатсызбы! KGzone сайтындагы ${c.title} (${c.year}-ж., $${c.priceUsd}) жарнамаңыз боюнча жазып жатам. Сатылып кеткен жокпу?`;
  if (lang === 'en') return `Hello! I am writing about your ${c.title} (${c.year}, $${c.priceUsd}) listing on KGzone. Is it still available?`;
  return `Здравствуйте! Пишу по вашему объявлению на KGzone: ${c.title} (${c.year} г., $${c.priceUsd}). Ещё продаётся?`;
}

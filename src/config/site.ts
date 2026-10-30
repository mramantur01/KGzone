// Site-wide contacts. Change them here only — every WhatsApp / phone link of KGzone uses these.
// Leave SITE_PHONE empty to hide all "contact KGzone" buttons.

/** Digits only, with country code, e.g. 996555777999 */
export const SITE_PHONE = '996555777999';

export const SITE_PHONE_DISPLAY = SITE_PHONE
  ? `+${SITE_PHONE.slice(0, 3)} ${SITE_PHONE.slice(3, 6)} ${SITE_PHONE.slice(6, 9)} ${SITE_PHONE.slice(9)}`
  : '';

/** WhatsApp link to KGzone with a prepared message, or null when no number is set */
export const siteWhatsApp = (text: string) => (SITE_PHONE ? `https://wa.me/${SITE_PHONE}?text=${encodeURIComponent(text)}` : null);

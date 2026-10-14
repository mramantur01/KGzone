// Runtime translation layer for KGzone.
//
// The site's source texts are Russian. Instead of threading t() through every component and
// mock-data record, this module watches the DOM and swaps Russian text nodes / attributes for
// their Kyrgyz or English version from locales/{kg,en}.json (keyed by the Russian text).
// App state (filters, statuses, form values) keeps the original Russian values, so no logic changes.
//
// Dictionary keys are whitespace-normalized Russian strings. Keys containing "{}" are patterns
// generated from template literals (e.g. "{} км"); any numbers in a text node can fill those slots.
// Mark an element with data-no-i18n to opt its subtree out (user-entered content, codes, etc.).

export type SiteLanguage = 'ru' | 'kg' | 'en';
type Dict = Record<string, string>;

const CYRILLIC = /[А-Яа-яЁё]/;
const NUMBER = /\d+(?:[  .,]\d+)*/g;
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

const loaders: Record<Exclude<SiteLanguage, 'ru'>, () => Promise<{ default: Dict }>> = {
  kg: () => import('./locales/kg.json'),
  en: () => import('./locales/en.json'),
};

let lang: SiteLanguage = 'ru';
let dict: Dict | null = null;
let patterns: { re: RegExp; out: string }[] = [];
let observer: MutationObserver | null = null;
let originalTitle = '';

// What we wrote into each node, so our own writes are not mistaken for new React text
const textState = new WeakMap<Text, { orig: string; applied: string }>();
const attrState = new WeakMap<Element, Map<string, { orig: string; applied: string }>>();

function fillSlots(template: string, values: string[]) {
  let i = 0;
  return template.replace(/\{\}/g, () => values[i++] ?? '');
}

function translateCore(core: string): string | null {
  if (!dict) return null;
  const exact = dict[core];
  if (exact) return exact;

  // Numbers rendered from template literals: "3 000 км" -> key "{} км"
  const nums = core.match(NUMBER);
  if (nums) {
    const viaNumbers = dict[core.replace(NUMBER, '{}')];
    if (viaNumbers) return fillSlots(viaNumbers, nums);
  }

  // Generic template patterns where slots hold arbitrary text
  for (const { re, out } of patterns) {
    const m = core.match(re);
    if (m) return fillSlots(out, m.slice(1));
  }
  return null;
}

export function translateString(text: string): string | null {
  if (lang === 'ru' || !text || !CYRILLIC.test(text)) return null;
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const core = m[2].replace(/\s+/g, ' ');
  const tr = translateCore(core);
  return tr == null ? null : m[1] + tr + m[3];
}

// Text inside <textarea>/<code>/editable areas is user content; their placeholder/title still translate
function isSkipped(el: Element | null, forAttribute = false): boolean {
  for (let cur = el; cur; cur = cur.parentElement) {
    if (cur.hasAttribute('data-no-i18n')) return true;
    if (forAttribute && cur === el) continue;
    if (SKIP_TAGS.has(cur.tagName) || (cur as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function processText(node: Text) {
  const state = textState.get(node);
  const current = node.nodeValue ?? '';
  if (state && current === state.applied) {
    if (lang !== 'ru') return; // our own translation, still valid
    node.nodeValue = state.orig; // switching back to Russian
    textState.delete(node);
    return;
  }
  // Fresh text from React (or untouched original)
  if (isSkipped(node.parentElement)) return;
  const tr = translateString(current);
  if (tr != null && tr !== current) {
    textState.set(node, { orig: current, applied: tr });
    node.nodeValue = tr;
  } else {
    textState.delete(node);
  }
}

function processAttr(el: Element, attr: string) {
  const value = el.getAttribute(attr);
  if (value == null) return;
  let states = attrState.get(el);
  const state = states?.get(attr);
  if (state && value === state.applied) {
    if (lang !== 'ru') return;
    el.setAttribute(attr, state.orig);
    states!.delete(attr);
    return;
  }
  if (isSkipped(el, true)) return;
  const tr = translateString(value);
  if (tr != null && tr !== value) {
    if (!states) attrState.set(el, (states = new Map()));
    states.set(attr, { orig: value, applied: tr });
    el.setAttribute(attr, tr);
  } else {
    states?.delete(attr);
  }
}

function processTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return processText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    for (const a of ATTRS) processAttr(root as Element, a);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) processText(n as Text);
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) processAttr(n as Element, a);
  }
}

function applyTitle() {
  if (!originalTitle) originalTitle = document.title;
  document.title = translateString(originalTitle) ?? originalTitle;
}

function buildPatterns(d: Dict) {
  patterns = Object.keys(d)
    .filter((k) => k.includes('{}') && k.replace(/\{\}/g, '').trim().length > 0)
    .sort((a, b) => b.length - a.length)
    .map((k) => ({
      re: new RegExp('^' + k.split('{}').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'),
      out: d[k],
    }));
}

export function startTranslator() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') processText(m.target as Text);
      else if (m.type === 'attributes') processAttr(m.target as Element, m.attributeName!);
      else m.addedNodes.forEach(processTree);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

let requestId = 0;
export async function setSiteLanguage(next: SiteLanguage) {
  const id = ++requestId;
  if (next === 'ru') {
    lang = 'ru';
    dict = null;
    patterns = [];
  } else {
    const loaded = (await loaders[next]()).default;
    if (id !== requestId) return; // a newer switch won
    lang = next;
    dict = loaded;
    buildPatterns(loaded);
  }
  // Re-run the whole page: restores originals for 'ru', retranslates otherwise
  restoreAll();
  processTree(document.body);
  applyTitle();
}

// Put every node we touched back to its Russian original before re-translating
function restoreAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const s = textState.get(n as Text);
      if (s && n.nodeValue === s.applied) n.nodeValue = s.orig;
      textState.delete(n as Text);
    } else {
      const states = attrState.get(n as Element);
      if (!states) continue;
      for (const [attr, s] of states) {
        if ((n as Element).getAttribute(attr) === s.applied) (n as Element).setAttribute(attr, s.orig);
      }
      attrState.delete(n as Element);
    }
  }
}

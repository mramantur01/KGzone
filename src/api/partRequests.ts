import { call } from './admin';

// "Find me a part" requests (when nothing is listed for the car yet)

export interface PartRequest {
  id: string;
  part: string;
  brand: string;
  model: string;
  generation: string;
  vin: string;
  comment: string;
  name: string;
  phone: string;
  status: 'new' | 'in_work' | 'done' | 'closed';
  createdAt: string;
}

export const sendPartRequest = (r: { part: string; brand?: string; model?: string; generation?: string; vin?: string; comment?: string; name?: string; phone?: string }) =>
  call('/api/part-requests', { method: 'POST', body: JSON.stringify(r) });

export const listPartRequests = () => call<{ requests: PartRequest[] }>('/api/admin/part-requests', {}, true).then((r) => r.requests);

export const setPartRequestStatus = (id: string, status: PartRequest['status']) =>
  call(`/api/admin/part-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);

// ---- Offers from sellers on a request; the buyer keeps a private link in this browser ----
export interface RequestOffer {
  id: string; sellerId: string; sellerName: string; sellerPhone: string; priceKgs: number; condition: string; note: string; partId?: string; createdAt: string; verified?: boolean;
}
export interface RequestView {
  request: { id: string; part: string; brand: string; model: string; generation?: string; vin?: string; comment?: string; status: string; createdAt: string };
  offers: RequestOffer[];
}
export interface MyRequest { id: string; key: string; part: string; createdAt: string }
const MY_KEY = 'kgzone-my-requests';
export const myRequests = (): MyRequest[] => { try { const v = JSON.parse(localStorage.getItem(MY_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
export const rememberRequest = (r: MyRequest) => { try { localStorage.setItem(MY_KEY, JSON.stringify([r, ...myRequests().filter((x) => x.id !== r.id)].slice(0, 20))); } catch { /* storage unavailable */ } };
export const forgetRequest = (id: string) => { try { localStorage.setItem(MY_KEY, JSON.stringify(myRequests().filter((x) => x.id !== id))); } catch { /* storage unavailable */ } };
export const requestKey = (id: string) => myRequests().find((r) => r.id === id)?.key || '';

export const getRequestView = (id: string, key: string) => call<RequestView>(`/api/part-requests/${encodeURIComponent(id)}?k=${encodeURIComponent(key)}`);
export const closeRequest = (id: string, key: string) => call(`/api/part-requests/${encodeURIComponent(id)}/close`, { method: 'POST', body: JSON.stringify({ k: key }) });
export const sendOffer = (id: string, offer: { priceKgs: number; condition?: string; note?: string; partId?: string }) =>
  call<{ offer: RequestOffer }>(`/api/part-requests/${encodeURIComponent(id)}/offers`, { method: 'POST', body: JSON.stringify(offer) });
export const requestPath = (id: string, key: string) => `/zayavka/${encodeURIComponent(id)}${key ? `?k=${key}` : ''}`;

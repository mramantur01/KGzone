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

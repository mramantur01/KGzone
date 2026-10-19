import { call } from './admin';

export const REPORT_REASONS = ['Неверная цена', 'Товар уже продан', 'Мошенничество', 'Неверное описание или фото', 'Спам или дубликат', 'Другое'] as const;

export interface ListingReport {
  id: string;
  kind: 'part' | 'car';
  listingId: string;
  listingTitle: string;
  reason: string;
  comment: string;
  contact: string;
  status: 'new' | 'resolved' | 'dismissed';
  createdAt: string;
}

export const sendReport = (r: { kind: 'part' | 'car'; listingId: string; listingTitle: string; reason: string; comment?: string; contact?: string }) =>
  call('/api/reports', { method: 'POST', body: JSON.stringify(r) });

export const listReports = () => call<{ reports: ListingReport[] }>('/api/admin/reports', {}, true).then((d) => d.reports);

export const setReportStatus = (id: string, status: ListingReport['status']) =>
  call(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);

import React from 'react';
import { ModerationPanel } from './ModerationPanel';
import { adminDeletePart, adminUpdatePart, listAdminParts, moderatePart, type ModeratedPart } from '../../api/parts';
import { listAdminCars, moderateCar, adminDeleteCar, type ModeratedCar } from '../../api/cars';
import { call } from '../../api/admin';
import { isVip } from '../../utils/demo';

// VIP placement is sold offline; the admin sets it for N days (0 removes it)
const vipAction = (kind: 'parts' | 'cars') => ({
  label: (x: { vipUntil?: string }) => (isVip(x) ? `VIP до ${new Date(x.vipUntil!).toLocaleDateString('ru-RU')} · снять` : 'Сделать VIP'),
  run: async (x: { id: string; vipUntil?: string }) => {
    let days = 0;
    if (!isVip(x)) {
      const v = window.prompt('На сколько дней VIP-размещение?', '7');
      days = Math.round(Number(v));
      if (!v || !days || days < 1) return;
    }
    await call(`/api/admin/${kind}/${encodeURIComponent(x.id)}/vip`, { method: 'POST', body: JSON.stringify({ days }) }, true);
  },
});

const listParts = () => listAdminParts('all');
const listCars = () => listAdminCars('all');

export const PartsModerationPanel: React.FC = () => (
  <ModerationPanel<ModeratedPart>
    title="Модерация запчастей продавцов"
    list={listParts}
    moderate={moderatePart}
    remove={adminDeletePart}
    publishedActions={[
      {
        label: (p) => (p.stockCount > 0 ? 'Нет в наличии' : 'В наличии'),
        run: (p) => adminUpdatePart(p.id, { stockCount: p.stockCount > 0 ? 0 : 1 }),
      },
      vipAction('parts'),
    ]}
    image={(p) => p.image}
    heading={(p) => p.title}
    details={(p) => (
      <>
        <div className="text-slate-300">
          {p.brand} {p.model} · OEM <span className="font-mono text-amber-300">{p.partNumber}</span> · {p.priceKgs.toLocaleString('ru-RU')} сом · {p.stockCount} шт.
        </div>
        <div className="text-slate-400">
          {p.storeName || p.companyName} · {p.market} {p.containerInfo ? `· ${p.containerInfo}` : ''} · {p.sellerPhone}
        </div>
        {p.description && <div className="text-slate-400 line-clamp-2">{p.description}</div>}
      </>
    )}
  />
);

export const CarsModerationPanel: React.FC = () => (
  <ModerationPanel<ModeratedCar>
    title="Модерация объявлений авто"
    list={listCars}
    moderate={moderateCar}
    remove={adminDeleteCar}
    publishedActions={[vipAction('cars')]}
    image={(c) => c.image || c.photos?.[0] || ''}
    heading={(c) => `${c.title} · $${c.priceUsd.toLocaleString('ru-RU')}`}
    details={(c) => (
      <>
        <div className="text-slate-300">
          {c.city} · {c.mileageKm.toLocaleString('ru-RU')} км · {c.transmission} · {c.fuelType} · {c.customs} · фото: {c.photos?.length || 0}
        </div>
        <div className="text-slate-400">
          {c.sellerName} · {c.sellerPhone} {c.plateNumber ? `· ${c.plateNumber}` : ''} {c.vin ? `· VIN ${c.vin}` : ''}
        </div>
        {c.description && c.description !== '—' && <div className="text-slate-400 line-clamp-2">{c.description}</div>}
      </>
    )}
  />
);

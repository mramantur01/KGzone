import React, { useEffect, useState } from 'react';
import { Loader2, X, ChevronRight } from 'lucide-react';
import { listCatalogGroups, listCatalogParts, type CatalogGroup, type CatalogPart, type CatalogVehicle } from '../../api/catalog';

// Vehicles found by VIN / frame -> assembly groups -> OEM numbers (from Laximo / TecDoc).
// Clicking an OEM number searches it among KGzone listings.
interface Props {
  vehicles: CatalogVehicle[];
  provider: string;
  onPickVehicle: (v: CatalogVehicle) => void;
  onSearchOem: (oem: string) => void;
  onClose: () => void;
}

export const CatalogBrowser: React.FC<Props> = ({ vehicles, provider, onPickVehicle, onSearchOem, onClose }) => {
  const [vehicle, setVehicle] = useState<CatalogVehicle | null>(vehicles.length === 1 ? vehicles[0] : null);
  const [groups, setGroups] = useState<CatalogGroup[] | null>(null);
  const [group, setGroup] = useState<CatalogGroup | null>(null);
  const [parts, setParts] = useState<CatalogPart[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle) return;
    onPickVehicle(vehicle);
    setGroups(null); setGroup(null); setParts(null); setError(null);
    listCatalogGroups(vehicle.ref).then(setGroups).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle || !group) return;
    setParts(null); setError(null);
    listCatalogParts(vehicle.ref, group.id).then(setParts).catch((e) => setError(e.message));
  }, [vehicle, group]);

  const vehicleLine = (v: CatalogVehicle) => [v.brand, v.model, v.modification, v.year, v.engine, v.bodyCode].filter(Boolean).join(' · ');

  return (
    <div className="mt-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-white">Каталог {provider}</span>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-neutral-800 cursor-pointer" aria-label="Закрыть"><X size={14} /></button>
      </div>

      {!vehicle && (
        <div className="space-y-1">
          <div className="text-neutral-400">Найдено несколько вариантов — выберите свой автомобиль:</div>
          {vehicles.map((v) => (
            <button key={v.ref} type="button" onClick={() => setVehicle(v)} className="w-full text-left px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer" data-no-i18n>
              {vehicleLine(v)}
            </button>
          ))}
        </div>
      )}

      {vehicle && (
        <>
          <div className="text-white font-semibold" data-no-i18n>{vehicleLine(vehicle)}</div>
          {error && <p className="text-red-400">{error}</p>}
          {!groups && !error && <Loader2 size={16} className="animate-spin text-neutral-400" />}
          {groups && !group && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto">
              {groups.map((g) => (
                <button key={g.id} type="button" onClick={() => setGroup(g)} className="text-left px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 flex items-center justify-between gap-2 cursor-pointer">
                  <span data-no-i18n>{g.name}</span><ChevronRight size={13} className="shrink-0" />
                </button>
              ))}
            </div>
          )}
          {group && (
            <div className="space-y-1">
              <button type="button" onClick={() => setGroup(null)} className="text-amber-400 underline cursor-pointer">← Все узлы</button>
              <div className="font-semibold text-neutral-300" data-no-i18n>{group.name}</div>
              {!parts && !error && <Loader2 size={16} className="animate-spin text-neutral-400" />}
              {parts && parts.length === 0 && <p className="text-neutral-400">В этом узле деталей нет</p>}
              {parts && parts.length > 0 && (
                <table className="w-full">
                  <tbody>
                    {parts.map((p, i) => (
                      <tr key={p.oem + i} className="border-t border-neutral-800">
                        <td className="py-1.5 pr-2 text-neutral-200" data-no-i18n>{p.name}{p.note ? <span className="text-neutral-500"> · {p.note}</span> : null}</td>
                        <td className="py-1.5 pr-2 text-neutral-500">{p.quantity || ''}</td>
                        <td className="py-1.5 text-right">
                          <button type="button" onClick={() => onSearchOem(p.oem)} className="font-mono font-bold text-amber-400 hover:underline cursor-pointer" title="Найти у продавцов KGzone">{p.oem}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

import React from 'react';
import { KG_REGIONS, REGION_PREFIX } from '../../data/regions';

/** <option>s for choosing one's own town, grouped by region (sign-up, profile, sell form, reviews) */
export const CityOptions: React.FC<{ optionClassName?: string }> = ({ optionClassName }) => (
  <>
    {KG_REGIONS.map((r) => (
      <optgroup key={r.name} label={r.name} className={optionClassName}>
        {r.cities.map((c) => <option key={c} value={c} className={optionClassName}>{c}</option>)}
      </optgroup>
    ))}
  </>
);

/** <option>s for a filter: a whole region («Вся Чуйская область») or one town */
export const RegionFilterOptions: React.FC<{ optionClassName?: string }> = ({ optionClassName }) => (
  <>
    {KG_REGIONS.map((r) => (
      <optgroup key={r.name} label={r.name} className={optionClassName}>
        {r.cities.length > 1 && <option value={REGION_PREFIX + r.name} className={optionClassName}>Вся {r.name}</option>}
        {r.cities.map((c) => <option key={c} value={c} className={optionClassName}>{c}</option>)}
      </optgroup>
    ))}
  </>
);

import { useEffect, useState } from 'react';
import { setUsdRate, USD_TO_KGS_RATE } from '../data/mockData';

// Official NBKR exchange rate (via our server). Until it loads, the last known value is used.
export interface RatesInfo { usd: number; date: string; official: boolean }

let info: RatesInfo = { usd: USD_TO_KGS_RATE, date: '', official: false };
let promise: Promise<RatesInfo> | null = null;

function load() {
  if (!promise) {
    promise = fetch('/api/rates')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.rates?.USD) {
          info = { usd: Math.round(d.rates.USD * 100) / 100, date: d.date || '', official: true };
          setUsdRate(info.usd);
        }
        return info;
      })
      .catch(() => info);
  }
  return promise;
}

/** Re-renders when the official rate arrives */
export function useRates(): RatesInfo {
  const [state, setState] = useState(info);
  useEffect(() => { load().then(setState); }, []);
  return state;
}

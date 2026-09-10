// admin/src/components/hooks/useLiveCollection.js
import { useEffect, useState } from "react";
import { dataStore } from "../services/dataStore";

// The second `file` argument is now ignored — kept so existing call sites
// (useLiveCollection("orders", "orders.json")) keep compiling untouched.
export function useLiveCollection(key) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const initial = await dataStore.load(key);
      if (mounted) setData(initial);
    })();

    const unsubscribe = dataStore.subscribe(key, async () => {
      const fresh = await dataStore.load(key);
      if (mounted) setData(fresh);
    });

    return () => { mounted = false; unsubscribe(); };
  }, [key]);

  return data;
}
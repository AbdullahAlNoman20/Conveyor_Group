import { useEffect, useState } from "react";
import { dataStore } from "../services/dataStore";

/**
 * Loads a dataStore collection and keeps it live: any insert/update/remove
 * anywhere in the app (this tab or another tab/role logged in alongside it)
 * automatically refreshes this component's copy. This is what makes the
 * Kitchen Board, Client order-progress view, Manager queue, etc. behave like
 * a genuinely real-time dashboard without a real backend/socket server.
 */
export function useLiveCollection(key, file) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const initial = await dataStore.load(key, file);
      if (mounted) setData(initial);
    })();

    const unsubscribe = dataStore.subscribe(key, async () => {
      const fresh = await dataStore.load(key, file);
      if (mounted) setData(fresh);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key, file]);

  return data;
}

// admin/src/components/hooks/useLiveCollection.js
import { useEffect, useState } from "react";
import { dataStore } from "../services/dataStore";

/**
 * Subscribes to a dataStore collection and re-reads it whenever the server
 * pushes a change for that key. Takes only the collection key — the seed-file
 * name the old localStorage version needed is gone.
 */
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
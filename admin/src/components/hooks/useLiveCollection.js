import { useEffect, useState } from "react";
import { dataStore } from "../services/dataStore";

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

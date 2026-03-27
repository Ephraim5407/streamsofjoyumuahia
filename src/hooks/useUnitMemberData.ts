import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSouls,
  addSoul,
  updateSoul,
  deleteSoul,
  type AddSoulInput,
} from "../api/souls";
import { listAssists } from "../api/assists";
import AsyncStorage from "../utils/AsyncStorage";

// Generic fetch hook builder for simple list endpoints
function useListFetcher<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const load = useCallback(
    async (opts: { force?: boolean } = {}) => {
      if (loading) return;
      if (!opts.force && Date.now() - lastFetchRef.current < 15_000) return; // throttle
      setLoading(true);
      setError(null);
      try {
        const res = await fetcher();
        setData(res);
        lastFetchRef.current = Date.now();
        try {
          await AsyncStorage.setItem(
            key,
            JSON.stringify({ t: Date.now(), v: res }),
          );
        } catch {}
      } catch (e: any) {
        setError(e?.message || "Failed");
        // try cache
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            setData(parsed.v);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    },
    [fetcher, key, loading],
  );

  useEffect(() => {
    load();
  }, [load]);
  const refresh = useCallback(() => load({ force: true }), [load]);
  return { data, loading, error, refresh, setData };
}

// Souls list hook (Logic Parity with Mobile)
export function useSouls(
  token: string | undefined,
  opts: { scope?: "mine" | "unit" | "auto"; unitId?: string } = {},
) {
  const { scope = "auto", unitId } = opts;

  const fetcher = useCallback(async () => {
    const tk = token || (await AsyncStorage.getItem("token"));
    if (!tk) throw new Error("No token");
    return listSouls(tk, { scope, unitId });
  }, [token, scope, unitId]);

  const hook = useListFetcher(
    `CACHE_SOULS_LIST_${scope}_${unitId || "none"}`,
    fetcher,
  );

  const create = useCallback(
    async (input: AddSoulInput) => {
      const tk = token || (await AsyncStorage.getItem("token"));
      if (!tk) throw new Error("No token");
      const res = await addSoul(input, tk);
      if (res.ok && res.soul) {
        hook.setData((prev) => {
          if (!prev) return { ok: true, souls: [res.soul!] } as any;
          return { ...prev, souls: [res.soul!, ...(prev as any).souls] };
        });
      }
      return res;
    },
    [token, hook],
  );

  const updateOne = useCallback(
    async (id: string, input: Partial<AddSoulInput>) => {
      const tk = token || (await AsyncStorage.getItem("token"));
      if (!tk) throw new Error("No token");
      const res = await updateSoul(id, input, tk);
      if (res.ok && res.soul) {
        hook.setData((prev) => {
          const arr = (prev as any)?.souls || [];
          const idx = arr.findIndex((s: any) => s._id === id);
          if (idx >= 0) {
            const copy = [...arr];
            copy[idx] = res.soul;
            return { ...prev, souls: copy } as any;
          }
          return prev as any;
        });
      }
      return res;
    },
    [token, hook],
  );

  const remove = useCallback(
    async (id: string) => {
      const tk = token || (await AsyncStorage.getItem("token"));
      if (!tk) throw new Error("No token");
      const res = await deleteSoul(id, tk);
      if (res.ok) {
        hook.setData((prev) => {
          const arr = (prev as any)?.souls || [];
          return {
            ...prev,
            souls: arr.filter((s: any) => s._id !== id),
          } as any;
        });
      }
      return res;
    },
    [token, hook],
  );

  return { ...hook, create, update: updateOne, remove };
}

// Additional hooks can be ported as needed for other dashboard counts
export function useAssists(
  token: string | undefined,
  opts: { scope?: "mine" | "unit" | "auto"; unitId?: string } = {},
) {
  const { scope = "auto", unitId } = opts;
  const fetcher = useCallback(async () => {
    const tk = token || (await AsyncStorage.getItem("token"));
    if (!tk) throw new Error("No token");
    const effScope =
      scope === "auto" || !scope ? undefined : (scope as "mine" | "unit");
    return listAssists(tk, { scope: effScope, unitId });
  }, [token, scope, unitId]);
  return useListFetcher(
    `CACHE_ASSISTS_LIST_${scope}_${unitId || "none"}`,
    fetcher,
  );
}

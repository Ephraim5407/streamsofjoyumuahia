import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSouls } from "../hooks/useUnitMemberData";
import AsyncStorage from "../utils/AsyncStorage";
import { AppEventBus } from "../utils/AppEventBus";

interface SoulsStoreValue {
  personalCount: number;
  unitCount: number;
  refreshAll: () => void;
  personalLoading: boolean;
  unitLoading: boolean;
  addSoul: (input: any) => Promise<any>;
}

const SoulsStoreContext = createContext<SoulsStoreValue | undefined>(undefined);

export const SoulsStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | undefined>();
  const [activeUnitId, setActiveUnitId] = useState<string | undefined>();

  const syncContext = useCallback(async () => {
    try {
      const [t1, aid] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("activeUnitId"),
      ]);
      setToken(t1 || undefined);
      setActiveUnitId(aid === "global" ? undefined : aid || undefined);
    } catch {}
  }, []);

  useEffect(() => {
    syncContext();
    const off = AppEventBus.on((event) => {
      if (
        event === "roleSwitched" ||
        event === "profileRefreshed" ||
        event === "roleSwitchOptimistic" ||
        event === "unitSwitched"
      ) {
        syncContext();
      }
    });
    return () => off();
  }, [syncContext]);

  const personal = useSouls(token, { scope: "mine" });
  const unit = useSouls(token, { scope: "unit", unitId: activeUnitId });

  // Re-fetch when context changes
  useEffect(() => {
    if (token) {
      personal.refresh();
      unit.refresh();
    }
  }, [token, activeUnitId, personal.refresh, unit.refresh]);

  const addSoul = useCallback(
    async (input: any) => {
      const res = await personal.create(input);
      if (res.ok && res.soul) {
        unit.refresh(); // Trigger refresh for unit list after a personal creation
      }
      return res;
    },
    [personal, unit],
  );

  const refreshAll = useCallback(() => {
    personal.refresh();
    unit.refresh();
  }, [personal, unit]);

  const filteredUnitSouls = useMemo(() => {
    const souls = (unit.data as any)?.souls || [];
    if (!activeUnitId) return souls;
    return souls.filter(
      (s: any) => String(s.unit || s.unitId || "") === String(activeUnitId),
    );
  }, [unit.data, activeUnitId]);

  const value = useMemo(
    () => ({
      personalCount: (personal.data as any)?.souls?.length || 0,
      unitCount: filteredUnitSouls.length,
      personalLoading: personal.loading,
      unitLoading: unit.loading,
      refreshAll,
      addSoul,
    }),
    [
      personal.data,
      personal.loading,
      filteredUnitSouls.length,
      unit.loading,
      refreshAll,
      addSoul,
    ],
  );

  return (
    <SoulsStoreContext.Provider value={value}>
      {children}
    </SoulsStoreContext.Provider>
  );
};

export function useSoulsStore() {
  const ctx = useContext(SoulsStoreContext);
  if (!ctx) throw new Error("useSoulsStore must be inside SoulsStoreProvider");
  return ctx;
}

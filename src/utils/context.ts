import AsyncStorage from "./AsyncStorage";

const INVALID = new Set(["", "global", "undefined", "null"]);
const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

function isValidUnitIdString(s: string | null | undefined): boolean {
  if (s == null || typeof s !== "string") return false;
  const t = s.trim();
  if (!t || INVALID.has(t)) return false;
  return OBJECT_ID_HEX.test(t);
}

function normalizeProfileUnit(raw: unknown): string | null {
  if (raw == null) return null;
  const id = typeof raw === "object" && raw !== null && "_id" in raw
    ? (raw as { _id?: unknown })._id
    : raw;
  const s = typeof id === "string" ? id.trim() : String(id).trim();
  if (!isValidUnitIdString(s)) return null;
  return s;
}

/**
 * Robustly resolves the active unit context from storage and user profiles.
 * This matches the "Super Resolution" logic used in dashboards.
 */
export async function getUnitContext(): Promise<string | null> {
  const directRaw = await AsyncStorage.getItem("activeUnitId");
  if (isValidUnitIdString(directRaw)) {
    return directRaw!.trim();
  }
  if (directRaw != null && directRaw !== "" && INVALID.has(directRaw.trim())) {
    await AsyncStorage.removeItem("activeUnitId");
  }

  const rawUser = await AsyncStorage.getItem("user");
  if (!rawUser) return null;

  try {
    const u = JSON.parse(rawUser);
    const roles = u?.roles || [];

    const activeRoleUnit = roles.find((r: any) => r.role === u?.activeRole && r.unit)?.unit;
    const unitLeaderRole = roles.find((r: any) => r.role === "UnitLeader" && r.unit)?.unit;
    const memberRole = roles.find((r: any) => r.role === "Member" && r.unit)?.unit;
    const anyUnitRole = roles.find((r: any) => r.unit)?.unit;

    const candidates: unknown[] = [
      u?.activeUnitId,
      u?.activeUnit,
      activeRoleUnit,
      unitLeaderRole,
      memberRole,
      anyUnitRole,
    ];

    for (const c of candidates) {
      const id = normalizeProfileUnit(c);
      if (id) {
        await AsyncStorage.setItem("activeUnitId", id);
        return id;
      }
    }
  } catch (e) {
    console.error("Context resolution error", e);
  }

  return null;
}

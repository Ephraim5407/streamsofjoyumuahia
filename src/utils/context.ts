import AsyncStorage from "./AsyncStorage";
import apiClient from "../api/client";

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
  const id =
    typeof raw === "object" && raw !== null && "_id" in raw
      ? (raw as { _id?: unknown })._id
      : raw;
  const s = typeof id === "string" ? id.trim() : String(id).trim();
  if (!isValidUnitIdString(s)) return null;
  return s;
}

/** Role entries from API are objects; legacy login cached `roles` as string[] only — skip those. */
function roleObjects(roles: unknown): any[] {
  if (!Array.isArray(roles)) return [];
  return roles.filter((r) => r && typeof r === "object" && typeof (r as any).role === "string");
}

/**
 * Derive unit id from a user object (cached or /api/users/me).
 */
export function extractUnitIdFromUserObject(u: any): string | null {
  if (!u) return null;
  const roles = roleObjects(u.roles);

  const activeRoleUnit = roles.find((r: any) => r.role === u.activeRole && r.unit)?.unit;
  const unitLeaderRole = roles.find((r: any) => r.role === "UnitLeader" && r.unit)?.unit;
  const memberRole = roles.find((r: any) => r.role === "Member" && r.unit)?.unit;
  const anyUnitRole = roles.find((r: any) => r.unit)?.unit;

  const candidates: unknown[] = [
    u.activeUnitId,
    u.activeUnit,
    activeRoleUnit,
    unitLeaderRole,
    memberRole,
    anyUnitRole,
  ];

  for (const c of candidates) {
    const id = normalizeProfileUnit(c);
    if (id) return id;
  }
  return null;
}

/**
 * Resolves active unit from localStorage only (no network).
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
    const id = extractUnitIdFromUserObject(u);
    if (id) {
      await AsyncStorage.setItem("activeUnitId", id);
      return id;
    }
  } catch (e) {
    console.error("Context resolution error", e);
  }

  return null;
}

/**
 * Like getUnitContext, but refreshes from `/api/users/me` and optionally matches
 * `/api/units` when the profile still has no unit (e.g. opened /manage-unit before /home).
 */
export async function resolveActiveUnitId(): Promise<string | null> {
  let id = await getUnitContext();
  if (id) return id;

  const token = await AsyncStorage.getItem("token");
  if (!token) return null;

  try {
    const meRes = await apiClient.get("/api/users/me");
    if (!meRes.data?.ok) return null;

    let u = meRes.data.user;
    const aid = await AsyncStorage.getItem("activeUnitId");
    if (aid && aid !== "global" && isValidUnitIdString(aid)) {
      u = { ...u, activeUnitId: aid };
    }
    await AsyncStorage.setItem("user", JSON.stringify(u));

    id = extractUnitIdFromUserObject(u);
    if (id) {
      await AsyncStorage.setItem("activeUnitId", id);
      return id;
    }

    try {
      const unitsRes = await apiClient.get("/api/units");
      if (unitsRes.data?.ok && Array.isArray(unitsRes.data.units)) {
        const myId = String(u._id || "");
        const uidIn = (arr: any[]) =>
          (arr || []).some((l: any) => {
            const lid = typeof l === "string" ? l : l?._id;
            return lid != null && String(lid) === myId;
          });
        const matched = unitsRes.data.units.find(
          (unt: any) => uidIn(unt.leaders || []) || uidIn(unt.members || []),
        );
        if (matched?._id) {
          const mid = normalizeProfileUnit(matched._id);
          if (mid) {
            await AsyncStorage.setItem("activeUnitId", mid);
            return mid;
          }
        }
      }
    } catch {
      /* non-fatal */
    }
  } catch (e) {
    console.error("resolveActiveUnitId", e);
  }

  return null;
}

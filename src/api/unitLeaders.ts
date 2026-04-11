import apiClient from "./client";

export interface UnitLeaderLite {
  _id: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  phone?: string;
  title?: string;
  profile?: { avatar?: string };
}

export async function listUnitLeaders(unitId: string, token: string) {
  const res = await apiClient.get(`/api/units/${unitId}/leaders/list`);
  return res.data as { ok?: boolean; leaders: UnitLeaderLite[] };
}

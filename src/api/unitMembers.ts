import apiClient from "./client";

export interface UnitMemberLite {
  name?: string;
  _id: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  phone?: string;
  gender?: string;
  title?: string;
  roles?: Array<{ role?: string; unit?: string; duties?: string[] }>;
  profile?: {
    avatar?: string;
    gender?: string;
    maritalStatus?: string;
    employmentStatus?: string;
  };
}

export async function listUnitMembers(unitId: string, token: string) {
  const res = await apiClient.get(`/api/units/${unitId}/members/list`);
  return res.data as { ok?: boolean; members: UnitMemberLite[] };
}

import apiClient from "./client";

export interface UnitLeaderSummary {
  ok: boolean;
  unit: { _id: string; name: string } | null;
  membersCount: number;
  soulsWonCount: number;
  finance: { income: number; expense: number; balance: number };
  upcomingEvents: { _id: string; title: string; date: string }[];
  message?: string;
}

export async function getUnitLeaderSummary(
  token: string,
  unitId?: string | null,
): Promise<UnitLeaderSummary> {
  const qs = unitId ? `?unitId=${encodeURIComponent(unitId)}` : "";
  const res = await apiClient.get(
    `/api/reports/unit-leader/summary${qs}`,
  );
  return res.data as UnitLeaderSummary;
}

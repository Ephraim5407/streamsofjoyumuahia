import axios from "axios";
import AsyncStorage from "../utils/AsyncStorage";
import { BASE_URl } from "./users";

export type FinanceTotals = {
  income: number;
  expense: number;
  balance: number;
  range?: string;
};
export type MinistrySummary = {
  ok: boolean;
  scope: { churchId: string; ministryName: string };
  totals: { workersTotal: number; soulsWon: number; financeRange?: string };
  finance: FinanceTotals;
  metrics?: { financeRange?: string };
};
export type ChurchSummary = {
  ok: boolean;
  scope: { churchId: string };
  totals: { workersTotal: number; soulsWon: number; ministryAdmins?: number };
  finance: FinanceTotals;
};

async function authHeaders() {
  const tk = await AsyncStorage.getItem("token");
  return { Authorization: `Bearer ${tk}` };
}

export async function getMinistrySummary(params?: {
  churchId?: string;
  ministry?: string;
}): Promise<MinistrySummary> {
  const res = await axios.get(`${BASE_URl}/api/summary/ministry`, {
    params,
    headers: await authHeaders(),
  });
  return res.data as MinistrySummary;
}

export async function getChurchSummary(params?: {
  churchId?: string;
}): Promise<ChurchSummary> {
  const res = await axios.get(`${BASE_URl}/api/summary/church`, {
    params,
    headers: await authHeaders(),
  });
  return res.data as ChurchSummary;
}

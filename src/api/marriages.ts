export type Marriage = {
  _id: string;
  name: string;
  date: string; // ISO
  note?: string;
  unit?: string;
  createdAt?: string;
};

import { BASE_URl } from "./users";
const base = BASE_URl + "/api";

export async function listMarriages(
  token: string,
  params?: { year?: string; q?: string; unitId?: string },
): Promise<Marriage[]> {
  const qs = new URLSearchParams();
  if (params?.year) qs.set("year", params.year);
  if (params?.q) qs.set("q", params.q);
  if (params?.unitId) qs.set("unitId", params.unitId);
  const url = qs.toString()
    ? `${base}/marriages?${qs.toString()}`
    : `${base}/api/marriages`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load marriages");
  const data = await res.json();
  return data.marriages || [];
}

export async function createMarriage(
  token: string,
  payload: { name: string; date: string; note?: string; unitId?: string },
): Promise<Marriage> {
  const res = await fetch(`${base}/marriages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  console.log(res);
  if (!res.ok) throw new Error("Failed to create");
  const data = await res.json();
  return data.marriage;
}

export async function updateMarriage(
  token: string,
  id: string,
  payload: Partial<{
    name: string;
    date: string;
    note?: string;
    unitId?: string;
  }>,
): Promise<Marriage> {
  const res = await fetch(`${base}/marriages/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update");
  const data = await res.json();
  return data.marriage;
}

export async function deleteMarriage(token: string, id: string): Promise<void> {
  const res = await fetch(`${base}/marriages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete");
}

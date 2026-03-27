import axios from "axios";
import { BASE_URl } from "./users";

export interface Invite {
  _id: string;
  name: string;
  phone?: string;
  gender?: string;
  ageRange?: string;
  method?: string;
  note?: string;
  invitedBy?: string;
  unit?: string;
  invitedAt?: string;
}

export interface ListInvitesResponse {
  ok?: boolean;
  invites: Invite[];
  total?: number;
}
export interface CreateInviteInput {
  name: string;
  phone?: string;
  gender?: string;
  ageRange?: string;
  method?: string;
  note?: string;
  unitId?: string;
  date?: string;
}

export async function listInvites(
  token: string,
  params: { scope?: "mine" | "unit"; q?: string } = {},
) {
  const res = await axios.get(`${BASE_URl}/api/invites`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as ListInvitesResponse;
}

export async function createInvite(input: CreateInviteInput, token: string) {
  const res = await axios.post(`${BASE_URl}/api/invites`, input, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as { ok: boolean; invite?: Invite; message?: string };
}

export async function updateInvite(
  id: string,
  input: Partial<CreateInviteInput>,
  token: string,
) {
  const res = await axios.put(`${BASE_URl}/api/invites/${id}`, input, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as { ok: boolean; invite?: Invite; message?: string };
}

export async function deleteInvite(id: string, token: string) {
  const res = await axios.delete(`${BASE_URl}/api/invites/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as { ok: boolean; message?: string };
}

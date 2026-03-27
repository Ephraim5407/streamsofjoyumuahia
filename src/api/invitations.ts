import axios from "axios";
import AsyncStorage from "../utils/AsyncStorage";
import { BASE_URl } from "./users";

const BASE =
  typeof BASE_URl === "string" && BASE_URl
    ? BASE_URl.replace(/\/$/, "")
    : "https://streamsofjoyumuahia-api-n6na.onrender.com";

export interface InvitationItem {
  _id: string;
  title: string;
  date?: string;
  time?: string;
  venue?: string;
  description?: string;
  tags?: string[];
  createdBy?: {
    _id: string;
    firstName: string;
    surname: string;
  };
  unit?: string;
  church?: string;
  createdAt: string;
}

const getAuthHeaders = async () => {
  const token =
    (await AsyncStorage.getItem("token")) ||
    (await AsyncStorage.getItem("auth_token"));
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createInvitation = async (data: {
  title: string;
  venue?: string;
  description?: string;
  date?: string;
  time?: string;
  tags?: string[];
}): Promise<InvitationItem[]> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${BASE}/api/invitations`, data, {
    headers,
  });
  return response.data.invitations || [];
};

export const listInvitations = async (): Promise<InvitationItem[]> => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${BASE}/api/invitations`, { headers });
  return response.data.invitations || [];
};

export const updateInvitation = async (
  id: string,
  data: Partial<InvitationItem>,
): Promise<InvitationItem> => {
  const headers = await getAuthHeaders();
  const response = await axios.put(`${BASE}/api/invitations/${id}`, data, {
    headers,
  });
  return response.data.invitation;
};

export const deleteInvitation = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.delete(`${BASE}/api/invitations/${id}`, { headers });
};

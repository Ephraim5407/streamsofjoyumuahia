import axios from "axios";
import { BASE_URl } from "./users";

export interface JoinRequestInput {
  targetChurch?: string | null;
  targetMinistry?: string | null;
  targetUnit?: string | null;
  requestedRole: "Member" | "UnitLeader";
}

export async function createJoinRequest(
  input: JoinRequestInput,
  token: string,
) {
  const res = await axios.post(`${BASE_URl}/api/join-requests`, input, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export default { createJoinRequest };

import apiClient from "./client";
import { BASE_URl } from "./users";

export interface Attendance {
  _id: string;
  unit: string;
  date: string;
  serviceType: string;
  maleCount: number;
  femaleCount: number;
  total: number;
  submittedBy: string;
  createdAt: string;
}

export interface AddAttendanceMainChurch {
  _id?: string;
  date: string;
  serviceType: string;
  maleCount: number;
  femaleCount: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getAttendances = async (token: string): Promise<Attendance[]> => {
  const res = await apiClient.get(`/api/attendance`);
  return res.data;
};

export const submitAttendance = async (
  attendanceList: any[],
  token: string,
) => {
  const res = await apiClient.post(
    `/api/attendance`,
    { attendanceList }
  );
  return res.data;
};

// Main Church Attendance APIs
export const getMainChurchAttendances = async (): Promise<
  AddAttendanceMainChurch[]
> => {
  const res = await apiClient.get(`/api/add-attendance-main-church`);
  return res.data;
};

export const submitMainChurchAttendance = async (
  attendance: Omit<AddAttendanceMainChurch, "_id" | "createdAt" | "updatedAt">,
) => {
  const res = await apiClient.post(
    `/api/add-attendance-main-church`,
    attendance,
  );
  return res.data;
};

export const updateMainChurchAttendance = async (
  id: string,
  attendance: Partial<AddAttendanceMainChurch>,
) => {
  const res = await apiClient.put(
    `/api/add-attendance-main-church/${id}`,
    attendance,
  );
  return res.data;
};

export const deleteMainChurchAttendance = async (id: string) => {
  const res = await apiClient.delete(
    `/api/add-attendance-main-church/${id}`,
  );
  return res.data;
};

// Y&S Attendance APIs
export interface AddAttendanceYS {
  _id?: string;
  date: string;
  serviceType: string;
  maleCount: number;
  femaleCount: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getYSAttendances = async (): Promise<AddAttendanceYS[]> => {
  const res = await apiClient.get(`/api/add-attendance-ys`);
  return res.data;
};

export const submitYSAttendance = async (
  attendance: Omit<AddAttendanceYS, "_id" | "createdAt" | "updatedAt">,
) => {
  const res = await apiClient.post(`/api/add-attendance-ys`, attendance);
  return res.data;
};

export const updateYSAttendance = async (
  id: string,
  attendance: Partial<AddAttendanceYS>,
) => {
  const res = await apiClient.put(
    `/api/add-attendance-ys/${id}`,
    attendance,
  );
  return res.data;
};

export const deleteYSAttendance = async (id: string) => {
  const res = await apiClient.delete(`/api/add-attendance-ys/${id}`);
  return res.data;
};

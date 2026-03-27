import axios from "axios";
import { BASE_URl } from "./users";
import AsyncStorage from "../utils/AsyncStorage";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface User {
  _id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email?: string;
  phone?: string;
  profile?: {
    avatar?: string;
  };
}

interface Deposit {
  accountDetails: string;
  bankName: string;
  referenceNumber: string;
  depositorName: string;
  depositDate: string;
  notes: string;
}

export interface IncomeRecord {
  _id?: string;
  id: string;
  category: Category;
  date: string;
  addedBy?: User;
  ministry: string;

  // Regular fields
  amount?: string;
  source?: string;
  paymentMethod?: string;
  description?: string;
  notes?: string;
  referenceNumber?: string;
  totalAmount?: string;
  donorName?: string;
  department?: string;
  eventName?: string;
  currency?: string;

  // Tithe fields
  titheCash?: string;
  titheBank?: string;
  titheCheque?: string;
  titheForeign1?: string;
  titheForeign2?: string;
  titheForeign3?: string;

  // Offering fields
  offeringCash?: string;
  offeringBank?: string;
  offeringCheque?: string;
  offeringForeign1?: string;
  offeringForeign2?: string;
  offeringForeign3?: string;

  // Deposits
  deposits?: Deposit[];
}

export interface ExpenseRecord {
  _id?: string;
  id: string;
  category: Category;
  date: string;
  addedBy?: User;
  ministry: string;
  amount: string;
  cash?: string;
  bank?: string;
  cheque?: string;
  foreign1?: string;
  foreign2?: string;
  foreign3?: string;
  totalDollar?: string;
  totalPound?: string;
  totalEuro?: string;
  description?: string;
}

async function getToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem("token");
  return token;
}

// INCOME API
export async function getIncomes(ministry: string): Promise<IncomeRecord[]> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.get(`${BASE_URl}/api/admin-finance/income`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { ministry },
  });

  if (res.data.ok) {
    return res.data.incomes;
  }
  throw new Error(res.data.message || "Failed to fetch incomes");
}

export async function createIncome(
  income: Omit<IncomeRecord, "_id">,
): Promise<IncomeRecord> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.post(`${BASE_URl}/api/admin-finance/income`, income, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.data.ok) {
    return res.data.income;
  }
  throw new Error(res.data.message || "Failed to create income");
}

export async function updateIncome(
  id: string,
  updates: Partial<IncomeRecord>,
): Promise<IncomeRecord> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.put(
    `${BASE_URl}/api/admin-finance/income/${id}`,
    updates,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.data.ok) {
    return res.data.income;
  }
  throw new Error(res.data.message || "Failed to update income");
}

export async function deleteIncome(id: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.delete(`${BASE_URl}/api/admin-finance/income/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.data.ok) {
    throw new Error(res.data.message || "Failed to delete income");
  }
}

// EXPENSE API
export async function getExpenses(ministry: string): Promise<ExpenseRecord[]> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.get(`${BASE_URl}/api/admin-finance/expense`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { ministry },
  });

  if (res.data.ok) {
    return res.data.expenses;
  }
  throw new Error(res.data.message || "Failed to fetch expenses");
}

export async function createExpense(
  expense: Omit<ExpenseRecord, "_id">,
): Promise<ExpenseRecord> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.post(
    `${BASE_URl}/api/admin-finance/expense`,
    expense,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.data.ok) {
    return res.data.expense;
  }
  throw new Error(res.data.message || "Failed to create expense");
}

export async function updateExpense(
  id: string,
  updates: Partial<ExpenseRecord>,
): Promise<ExpenseRecord> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.put(
    `${BASE_URl}/api/admin-finance/expense/${id}`,
    updates,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.data.ok) {
    return res.data.expense;
  }
  throw new Error(res.data.message || "Failed to update expense");
}

export async function deleteExpense(id: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.delete(
    `${BASE_URl}/api/admin-finance/expense/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.data.ok) {
    throw new Error(res.data.message || "Failed to delete expense");
  }
}

// FINANCIAL TOTALS API
export interface FinancialTotals {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  range?: string;
}

export async function getFinancialTotals(
  ministry: string,
): Promise<FinancialTotals> {
  const token = await getToken();
  if (!token) throw new Error("No auth token");

  const res = await axios.get(`${BASE_URl}/api/admin-finance/totals`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { ministry },
  });

  if (res.data.ok) {
    return res.data.totals;
  }
  throw new Error(res.data.message || "Failed to fetch financial totals");
}

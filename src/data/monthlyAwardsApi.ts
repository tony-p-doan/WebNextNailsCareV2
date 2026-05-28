import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {httpsCallable} from "firebase/functions";
import {db, functions} from "../core/firebase/firebase";
import type {MonthlyAward, MonthlyAwardKind, MonthlyAwardSettings} from "../domain/models/MonthlyAward";

const defaultSettings: MonthlyAwardSettings = {
  customerOfMonthEnabled: true,
  employeeOfMonthEnabled: true,
};

function awardsCol(storeId: string) {
  return collection(db, "stores", storeId, "monthlyAwards");
}

function settingsDoc(storeId: string) {
  return doc(db, "stores", storeId, "awardSettings", "monthly");
}

function toAward(id: string, data: Record<string, unknown>): MonthlyAward {
  return {
    id,
    awardId: data.awardId as string | undefined,
    storeId: (data.storeId as string) ?? "",
    kind: (data.kind as MonthlyAwardKind) ?? "customer",
    month: Number(data.month ?? 1),
    year: Number(data.year ?? new Date().getFullYear()),
    monthKey: (data.monthKey as string) ?? "",
    status: (data.status as MonthlyAward["status"]) ?? "draft",
    displayName: (data.displayName as string) ?? "",
    reason: (data.reason as string) ?? "",
    reasons: Array.isArray(data.reasons) ? data.reasons as string[] : [],
    rewardPoints: Number(data.rewardPoints ?? 0),
    customerId: data.customerId as string | null | undefined,
    providerId: data.providerId as string | null | undefined,
    candidateId: data.candidateId as string | undefined,
    score: data.score as number | undefined,
    rank: data.rank as number | undefined,
    publicOptOut: data.publicOptOut === true,
  };
}

export async function getMonthlyAwardSettings(storeId: string): Promise<MonthlyAwardSettings> {
  const snap = await getDoc(settingsDoc(storeId));
  if (!snap.exists()) return defaultSettings;
  const data = snap.data();
  return {
    customerOfMonthEnabled: data.customerOfMonthEnabled !== false,
    employeeOfMonthEnabled: data.employeeOfMonthEnabled !== false,
  };
}

export async function setMonthlyAwardSettings(storeId: string, settings: Partial<MonthlyAwardSettings>): Promise<void> {
  await httpsCallable(functions, "setMonthlyAwardSettings")({storeId, ...settings});
}

export async function generateMonthlyAwardSuggestions(
  storeId: string,
  kind: MonthlyAwardKind,
  year: number,
  month: number,
): Promise<void> {
  await httpsCallable(functions, "generateMonthlyAwardSuggestions")({storeId, kind, year, month});
}

export async function listMonthlyAwards(storeId: string, monthKey?: string): Promise<MonthlyAward[]> {
  const constraints = monthKey
    ? [where("monthKey", "==", monthKey), orderBy("rank", "asc")]
    : [orderBy("monthKey", "desc"), orderBy("rank", "asc")];
  const snap = await getDocs(query(awardsCol(storeId), ...constraints));
  return snap.docs.map((d) => toAward(d.id, d.data()));
}

export async function listPublishedMonthlyAwards(storeId: string): Promise<MonthlyAward[]> {
  const snap = await getDocs(query(awardsCol(storeId), where("status", "==", "published")));
  return snap.docs.map((d) => toAward(d.id, d.data())).filter((a) => !a.publicOptOut);
}

export async function updateMonthlyAward(
  storeId: string,
  awardId: string,
  data: Partial<Pick<MonthlyAward, "status" | "reason" | "rewardPoints" | "publicOptOut">>,
): Promise<void> {
  await updateDoc(doc(awardsCol(storeId), awardId), data as Record<string, unknown>);
}

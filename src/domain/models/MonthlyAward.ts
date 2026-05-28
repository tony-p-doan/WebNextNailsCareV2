export type MonthlyAwardKind = "customer" | "employee";
export type MonthlyAwardStatus = "draft" | "published" | "archived";

export interface MonthlyAward {
  id: string;
  awardId?: string;
  storeId: string;
  kind: MonthlyAwardKind;
  month: number;
  year: number;
  monthKey: string;
  status: MonthlyAwardStatus;
  displayName: string;
  reason: string;
  reasons: string[];
  rewardPoints: number;
  customerId?: string | null;
  providerId?: string | null;
  candidateId?: string;
  score?: number;
  rank?: number;
  publicOptOut?: boolean;
}

export interface MonthlyAwardSettings {
  customerOfMonthEnabled: boolean;
  employeeOfMonthEnabled: boolean;
}

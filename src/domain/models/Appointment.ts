export type AppointmentStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export type AppointmentItem = {
  id: string;
  memberId: string;
  serviceId: string;
  providerAssignmentMode: "ANY_QUALIFIED_PROVIDER" | "SPECIFIC_PROVIDER";
  providerId: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  priceCents: number;
  durationMinutes: number;
  isRedeemed: boolean;
  pointsAwarded?: boolean;
  pointsAwardedAmount?: number;
};

export type Appointment = {
  id: string;
  shopId: string;
  customerId: string;
  status: AppointmentStatus;
  totalPriceCents: number;
  createdAt: string; // ISO
};

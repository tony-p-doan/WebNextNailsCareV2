export interface Store {
  id: string;
  storeAdminId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  isDemoStore?: boolean;
  isEnabled?: boolean;
  /** "deleted" when soft-deleted by superadmin; absent or undefined otherwise. */
  status?: string;
}

/** Build the full display address for a store, e.g. "123 Main St, Austin, TX 78701". */
export function fullAddress(store: Pick<Store, "address" | "city" | "state" | "zip">): string {
  const parts = [store.address, store.city, store.state, store.zip].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.join(", ");
}

/** Build a Google Maps URL for a store. */
export function mapsUrl(store: Pick<Store, "address" | "city" | "state" | "zip" | "businessName">): string {
  const addr = fullAddress(store) || store.businessName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  accountEmail?: string;
  accountUid?: string;
  serviceIds: string[];
}

export interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
  durationMinutes: number | null;
  priceCents: number | null;
  rewardsPoints: number;
  isActive: boolean;
}

export interface PersonalSlot {
  start: string;
  end: string;
}

export interface ScheduleDay {
  employeeId: string;
  date: string;
  workStart: string | null;
  workEnd: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  personalStart: string | null;
  personalEnd: string | null;
  /** Multiple personal (e.g. lunch) slots; first is also reflected in lunchStart/lunchEnd. */
  personalSlots?: PersonalSlot[];
}

export function serviceIsComplete(s: Service): boolean {
  return (s.title?.trim() ?? "") !== "" && s.durationMinutes != null && s.priceCents != null;
}

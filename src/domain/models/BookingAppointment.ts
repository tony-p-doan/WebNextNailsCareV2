/** An appointment being built in the booking flow (cart item). */
export interface BookingAppointment {
  storeId: string;
  storeName: string;
  serviceId: string;
  serviceTitle: string;
  serviceIcon: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  timeSlot: string;
  durationMinutes: number;
  employeeId: string | null;
  employeeName: string;
  /** In cents (0 if reward applied). */
  priceCents: number;
  /** Original price in cents, before reward applied. */
  originalPriceCents: number;
  /** Reward points earned on save. */
  rewardsPoints: number;
  /** Optional party/guest name; null = primary user. */
  partyName: string | null;
  /** True when the customer used the Special Request flow (off-schedule time). */
  isSpecialRequest?: boolean;
}

/** An appointment saved to Firestore. */
export interface SavedAppointment {
  id: string;
  storeId: string;
  storeName: string;
  /** Full address of the store at time of booking (for Google Maps link). */
  storeAddress?: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  employeeId: string | null;
  employeeName: string;
  priceCents: number;
  rewardsPoints: number;
  partyName: string | null;
  status: string;
  paymentStatus?: string;
  customerUserId: string;
  /** Display name for walk-in / guest customers (set by store admin). */
  customerName?: string;
  /** Phone number for walk-in / guest customers (set by store admin). */
  customerPhone?: string;
  /** True when the appointment was created via the Special Request flow. */
  isSpecialRequest?: boolean;
  /** Approval state for Special Requests: "pending" | "approved" | "rejected". */
  approvalStatus?: string;
  /** Reason text supplied by the store admin when rejecting. */
  rejectionReason?: string;
  /** True when the customer dismissed a rejected Special Request card. */
  dismissedByCustomer?: boolean;
}

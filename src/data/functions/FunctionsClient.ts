import {httpsCallable} from "firebase/functions";
import {functions} from "../../core/firebase/firebase";

interface CheckoutSessionRequest {
  origin: string;
}

interface CheckoutSessionResponse {
  url: string;
}

export interface StripeTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string | null;
  created: number;
  hostedInvoiceUrl: string | null;
  description: string | null;
}

/**
 * Richer transaction shape returned by the superadmin
 * `getStoreTransactionHistory` callable. Includes invoice number, billing
 * period and PDF link in addition to the fields above.
 */
export interface StoreStripeTransaction extends StripeTransaction {
  number: string | null;
  amountDue: number;
  periodStart: number | null;
  periodEnd: number | null;
  billingReason: string | null;
  invoicePdf: string | null;
}

export interface StoreTransactionHistory {
  transactions: StoreStripeTransaction[];
  stripeCustomerId: string | null;
}

export interface AdminEntry {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  isOwner: boolean;
}

export interface PendingInvite {
  token: string;
  email: string;
  createdAtMs: number;
  expiresAtMs: number;
  createdByUid: string;
  createdByEmail: string;
}

export interface AdminsSnapshot {
  admins: AdminEntry[];
  pending: PendingInvite[];
}

export type InviteOutcome =
  | {status: "added"; method: "push" | "no_token" | "email" | "push_email"; email: string}
  | {status: "already_admin"; method: "noop"; email: string}
  | {status: "invited"; method: "email"; email: string};

export type EmployeeInviteOutcome = {
  status: "added_existing_employee" | "added_role" | "invited";
  email: string;
};

export interface InvitePreview {
  storeId: string;
  storeName: string;
  email: string;
}

export interface EmployeeInvitePreview {
  storeId: string;
  storeName: string;
  email: string;
}

export interface CreatedStore {
  id: string;
  storeAdminId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  isEnabled: boolean;
}

export interface CustomerRewardsProgramStore {
  storeId: string;
  storeName: string;
  points: number;
  tier: "gold" | "platinum";
  appointmentCount: number;
  platinumAppointmentsRequired: number;
  appointmentsUntilPlatinum: number;
  rewards: Array<{
    id: string;
    type: "reward";
    title: string;
    description: string;
    pointsRequired: number;
    isEnabled: boolean;
  }>;
  specialOffers: Array<{
    id: string;
    type: "specialOffer";
    title: string;
    description: string;
    dollarValueCents: number | null;
    memberTier: "gold" | "platinum";
    pointsRequired: number;
    isIncludedForMember: boolean;
  }>;
}

export interface CustomerRewardsProgram {
  defaultTier: "gold";
  stores: CustomerRewardsProgramStore[];
}

export interface RedeemRewardResponse {
  status: "redeemed";
  redemptionId: string;
  pointsDeducted: number;
  pointsAfter: number;
}

export class FunctionsClient {
  static async createCheckoutSession(origin: string): Promise<string> {
    const fn = httpsCallable<CheckoutSessionRequest, CheckoutSessionResponse>(
      functions,
      "createStripeCheckoutSession"
    );
    const result = await fn({origin});
    return result.data.url;
  }

  static async getTransactionHistory(): Promise<StripeTransaction[]> {
    const fn = httpsCallable<Record<string, never>, {transactions: StripeTransaction[]}>(
      functions,
      "getTransactionHistory"
    );
    const result = await fn({});
    return result.data.transactions;
  }

  static async listStoreAdmins(storeId: string): Promise<AdminsSnapshot> {
    const fn = httpsCallable<{storeId: string}, AdminsSnapshot>(
      functions,
      "listStoreAdmins"
    );
    const result = await fn({storeId});
    return result.data;
  }

  static async inviteStoreAdmin(
    storeId: string,
    email: string
  ): Promise<InviteOutcome> {
    const fn = httpsCallable<{storeId: string; email: string}, InviteOutcome>(
      functions,
      "inviteStoreAdmin"
    );
    const result = await fn({storeId, email});
    return result.data;
  }

  static async createAdditionalStore(
    businessName: string,
    address: string,
    city: string,
    state: string,
    zip: string
  ): Promise<CreatedStore> {
    const fn = httpsCallable<
      {
        businessName: string;
        address: string;
        city: string;
        state: string;
        zip: string;
      },
      CreatedStore
    >(functions, "createAdditionalStore");
    const result = await fn({businessName, address, city, state, zip});
    return result.data;
  }

  static async removeStoreAdmin(storeId: string, uid: string): Promise<void> {
    const fn = httpsCallable<{storeId: string; uid: string}, {ok: boolean}>(
      functions,
      "removeStoreAdmin"
    );
    await fn({storeId, uid});
  }

  static async revokeStoreAdminInvite(
    storeId: string,
    token: string
  ): Promise<void> {
    const fn = httpsCallable<{storeId: string; token: string}, {ok: boolean}>(
      functions,
      "revokeStoreAdminInvite"
    );
    await fn({storeId, token});
  }

  static async previewStoreAdminInvite(
    token: string
  ): Promise<InvitePreview | null> {
    const fn = httpsCallable<{token: string}, InvitePreview>(
      functions,
      "getStoreAdminInvitePreview"
    );
    try {
      const result = await fn({token});
      return result.data ?? null;
    } catch {
      return null;
    }
  }

  static async acceptStoreAdminInvite(token: string): Promise<void> {
    const fn = httpsCallable<{token: string}, {ok: boolean; storeId: string}>(
      functions,
      "acceptStoreAdminInvite"
    );
    await fn({token});
  }

  static async inviteEmployee(
    storeId: string,
    employeeId: string,
    email: string
  ): Promise<EmployeeInviteOutcome> {
    const fn = httpsCallable<
      {storeId: string; employeeId: string; email: string},
      EmployeeInviteOutcome
    >(functions, "inviteEmployee");
    const result = await fn({storeId, employeeId, email});
    return result.data;
  }

  static async previewEmployeeInvite(
    token: string
  ): Promise<EmployeeInvitePreview | null> {
    const fn = httpsCallable<{token: string}, EmployeeInvitePreview>(
      functions,
      "getEmployeeInvitePreview"
    );
    try {
      const result = await fn({token});
      return result.data ?? null;
    } catch {
      return null;
    }
  }

  static async acceptEmployeeInvite(token: string): Promise<void> {
    const fn = httpsCallable<{token: string}, {storeId: string; employeeId: string}>(
      functions,
      "acceptEmployeeInvite"
    );
    await fn({token});
  }

  static async cancelEmployeeAppointment(
    storeId: string,
    appointmentId: string
  ): Promise<{emailDelivered: boolean}> {
    const fn = httpsCallable<
      {storeId: string; appointmentId: string},
      {status: "cancelled"; emailDelivered: boolean}
    >(functions, "cancelEmployeeAppointment");
    const result = await fn({storeId, appointmentId});
    return {emailDelivered: result.data.emailDelivered};
  }

  static async markAppointmentPaid(
    storeId: string,
    appointmentId: string
  ): Promise<void> {
    const fn = httpsCallable<
      {storeId: string; appointmentId: string},
      {status: "paid"}
    >(functions, "markAppointmentPaid");
    await fn({storeId, appointmentId});
  }

  static async getStoreTransactionHistory(
    storeId: string
  ): Promise<StoreTransactionHistory> {
    const fn = httpsCallable<{storeId: string}, StoreTransactionHistory>(
      functions,
      "getStoreTransactionHistory"
    );
    const result = await fn({storeId});
    return result.data;
  }

  static async approveSpecialRequest(
    storeId: string,
    appointmentId: string
  ): Promise<void> {
    const fn = httpsCallable<
      {storeId: string; appointmentId: string},
      {status: "approved"}
    >(functions, "approveSpecialRequest");
    await fn({storeId, appointmentId});
  }

  static async rejectSpecialRequest(
    storeId: string,
    appointmentId: string,
    reason: string
  ): Promise<{emailDelivered: boolean; hasEmail: boolean}> {
    const fn = httpsCallable<
      {storeId: string; appointmentId: string; reason: string},
      {status: "rejected"; emailDelivered: boolean; hasEmail: boolean}
    >(functions, "rejectSpecialRequest");
    const result = await fn({storeId, appointmentId, reason});
    return {
      emailDelivered: result.data.emailDelivered,
      hasEmail: result.data.hasEmail,
    };
  }

  static async setRewardStatusSettings(
    storeId: string,
    platinumAppointmentsRequired: number
  ): Promise<{platinumAppointmentsRequired: number}> {
    const fn = httpsCallable<
      {storeId: string; platinumAppointmentsRequired: number},
      {platinumAppointmentsRequired: number}
    >(functions, "setRewardStatusSettings");
    const result = await fn({storeId, platinumAppointmentsRequired});
    return result.data;
  }

  static async getCustomerRewardsProgram(): Promise<CustomerRewardsProgram> {
    const fn = httpsCallable<Record<string, never>, CustomerRewardsProgram>(
      functions,
      "getCustomerRewardsProgram"
    );
    const result = await fn({});
    return result.data;
  }

  static async redeemRewardItem(
    storeId: string,
    customerUserId: string,
    itemType: "reward" | "specialOffer",
    itemId: string
  ): Promise<RedeemRewardResponse> {
    const fn = httpsCallable<
      {
        storeId: string;
        customerUserId: string;
        itemType: "reward" | "specialOffer";
        itemId: string;
      },
      RedeemRewardResponse
    >(functions, "redeemRewardItem");
    const result = await fn({storeId, customerUserId, itemType, itemId});
    return result.data;
  }

  static async createExperienceShare(data: {
    storeId: string;
    beforeImageUrl: string;
    afterImageUrl: string;
    beforeImageUrls?: string[];
    afterImageUrls?: string[];
    serviceType: string;
    appointmentId?: string;
  }): Promise<{shareId: string; shareUrl: string}> {
    const fn = httpsCallable<
      {
        storeId: string;
        beforeImageUrl: string;
        afterImageUrl: string;
        beforeImageUrls?: string[];
        afterImageUrls?: string[];
        serviceType: string;
        appointmentId?: string;
      },
      {shareId: string; shareUrl: string}
    >(functions, "createExperienceShare");
    const result = await fn(data);
    return result.data;
  }

  static async bookByAIConversation(
    messages: Array<{role: string; content: string}>,
    userLocation?: {latitude: number; longitude: number} | null
  ): Promise<BookByAIConversationResponse> {
    const fn = httpsCallable<
      {
        systemPrompt: string;
        messages: Array<{role: string; content: string}>;
        userLocation?: {latitude: number; longitude: number} | null;
      },
      BookByAIConversationResponse
    >(functions, "bookByAIConversation");
    const result = await fn({
      systemPrompt: BOOK_BY_AI_PROMPT,
      messages,
      userLocation,
    });
    return result.data;
  }
}

export interface BookByAIAppointmentPayload {
  storeId: string;
  storeName: string;
  storeAddress?: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  timeSlot: string;
  employeeId?: string;
  employeeName?: string;
  durationMinutes: number;
  priceCents: number;
  rewardsPoints: number;
  isSpecialRequest?: boolean;
}

export interface BookByAIConversationResponse {
  reply: string;
  optionsText?: string | null;
  appointment?: BookByAIAppointmentPayload | null;
}

const BOOK_BY_AI_PROMPT =
  "Hi there. My name is Swabi. You can book your appointment with me. " +
  "Just tell me the service you want and date and time along with a " +
  "provider name if you prefer someone. Continue talking to the customer " +
  "until you have the store, service, date, time, and provider preference. " +
  "Ask for only one missing piece of appointment information at a time. " +
  "Once all the information is given by the customer, summarize the " +
  "appointment information, check that the appointment is available, and " +
  "return an appointment JSON payload only when it is available or should " +
  "be reviewed as a Special Request.";

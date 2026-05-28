import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import {db} from "../core/firebase/firebase";
import type {BookingAppointment, SavedAppointment} from "../domain/models/BookingAppointment";

const STORES = "stores";
const APPOINTMENTS = "appointments";
const USERS = "users";

function aptCol(storeId: string) {
  return collection(db, STORES, storeId, APPOINTMENTS);
}

function aptDoc(storeId: string, aptId: string) {
  return doc(db, STORES, storeId, APPOINTMENTS, aptId);
}

function userAptCol(uid: string) {
  return collection(db, USERS, uid, APPOINTMENTS);
}

function userAptDoc(uid: string, aptId: string) {
  return doc(db, USERS, uid, APPOINTMENTS, aptId);
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapAppointment(
  id: string,
  storeIdFallback: string,
  data: Record<string, unknown>
): SavedAppointment {
  return {
    id,
    storeId: (data.storeId as string) || storeIdFallback,
    storeName: (data.storeName as string) ?? "",
    storeAddress: (data.storeAddress as string) ?? "",
    serviceId: (data.serviceId as string) ?? "",
    serviceTitle: (data.serviceTitle as string) ?? "",
    date: (data.date as string) ?? "",
    timeSlot: (data.timeSlot as string) ?? "",
    durationMinutes: (data.durationMinutes as number) ?? 0,
    employeeId: (data.employeeId as string) || null,
    employeeName: (data.employeeName as string) ?? "Any Provider",
    priceCents: (data.priceCents as number) ?? 0,
    rewardsPoints: (data.rewardsPoints as number) ?? 0,
    partyName: (data.partyName as string) || null,
    status: (data.status as string) ?? "booked",
    paymentStatus: (data.paymentStatus as string) ?? "unpaid",
    customerUserId: (data.customerUserId as string) ?? "",
    customerName: (data.customerName as string) || undefined,
    customerPhone: (data.customerPhone as string) || undefined,
    isSpecialRequest: (data.isSpecialRequest as boolean) || undefined,
    approvalStatus: (data.approvalStatus as string) || undefined,
    rejectionReason: (data.rejectionReason as string) || undefined,
    dismissedByCustomer: (data.dismissedByCustomer as boolean) || undefined,
  };
}

/** Save a list of booking appointments to Firestore. Also mirrors to users/{uid}/appointments. */
export async function saveAppointments(
  appointments: BookingAppointment[],
  customerUserId: string,
  guestInfo?: {customerName?: string; customerPhone?: string},
  storeAddress?: string,
): Promise<void> {
  for (const apt of appointments) {
    const data: Record<string, unknown> = {
      storeId: apt.storeId,
      storeName: apt.storeName,
      ...(storeAddress ? {storeAddress} : {}),
      serviceId: apt.serviceId,
      serviceTitle: apt.serviceTitle,
      date: apt.date,
      timeSlot: apt.timeSlot,
      durationMinutes: apt.durationMinutes,
      employeeId: apt.employeeId ?? "",
      employeeName: apt.employeeName,
      priceCents: apt.priceCents,
      rewardsPoints: apt.rewardsPoints,
      partyName: apt.partyName ?? "",
      customerUserId,
      status: "booked",
    };
    if (guestInfo?.customerName) data.customerName = guestInfo.customerName;
    if (guestInfo?.customerPhone) data.customerPhone = guestInfo.customerPhone;
    if (apt.isSpecialRequest) {
      data.isSpecialRequest = true;
      data.approvalStatus = "pending";
    }
    const ref = await addDoc(aptCol(apt.storeId), data);
    // Mirror to user's appointments subcollection
    await setDoc(userAptDoc(customerUserId, ref.id), {...data, id: ref.id});
  }
}

function isRevenueAppointmentStatus(status: string | undefined): boolean {
  return status === "booked" || status === "done" || status === "completed" || status === "COMPLETED";
}

/** Get stats (appointment count + revenue in cents) for a given date. */
export async function getStatsForDate(
  storeId: string,
  date: string
): Promise<{count: number; revenueCents: number}> {
  const q = query(aptCol(storeId), where("date", "==", date));
  const snap = await getDocs(q);
  let revenueCents = 0;
  let count = 0;
  snap.docs.forEach((d) => {
    if (!isRevenueAppointmentStatus(d.data().status as string | undefined)) return;
    count += 1;
    revenueCents += (d.data().priceCents as number) ?? 0;
  });
  return {count, revenueCents};
}

/** Get today's stats. */
export async function getTodaysStats(storeId: string) {
  return getStatsForDate(storeId, todayString());
}

/** Upcoming booked appointments for a store (today and after). */
export async function getUpcomingAppointments(
  storeId: string,
  storeName: string
): Promise<SavedAppointment[]> {
  const today = todayString();
  const q = query(
    aptCol(storeId),
    where("status", "==", "booked"),
    where("date", ">=", today),
    orderBy("date"),
    orderBy("timeSlot")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const apt = mapAppointment(d.id, storeId, d.data());
    if (!apt.storeName) apt.storeName = storeName;
    return apt;
  });
}

export async function getUpcomingAppointmentsForEmployee(
  storeId: string,
  employeeId: string
): Promise<SavedAppointment[]> {
  const q = query(
    aptCol(storeId),
    where("employeeId", "==", employeeId),
    where("date", ">=", todayString()),
    orderBy("date"),
    orderBy("timeSlot")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, storeId, d.data()))
    .filter((apt) => apt.status === "booked");
}

/** Customer's upcoming appointments — single-field collection-group query on
 *  customerUserId across all stores, with date/status filtered client-side.
 *  Special Requests in any approval state are included so the customer can
 *  see Pending / Rejected badges (until they dismiss a rejection). */
export async function getCustomerUpcomingAppointments(uid: string): Promise<SavedAppointment[]> {
  const today = todayString();
  const q = query(
    collectionGroup(db, APPOINTMENTS),
    where("customerUserId", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, "", d.data()))
    .filter((a) => {
      if (a.status === "cancelled" || a.status === "done") return false;
      if (a.date < today) return false;
      if (a.isSpecialRequest && a.approvalStatus === "rejected" && a.dismissedByCustomer) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.timeSlot.localeCompare(b.timeSlot));
}

export async function getCustomerCompletedAppointments(uid: string): Promise<SavedAppointment[]> {
  const q = query(
    collectionGroup(db, APPOINTMENTS),
    where("customerUserId", "==", uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, "", d.data()))
    .filter((a) => a.status === "done" || a.status === "completed" || a.status === "COMPLETED")
    .sort((a, b) => a.date !== b.date ? b.date.localeCompare(a.date) : b.timeSlot.localeCompare(a.timeSlot));
}

export async function getCustomerStoreAppointmentCountLast12Months(
  uid: string,
  storeId: string
): Promise<number> {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const q = query(
    userAptCol(uid),
    where("storeId", "==", storeId),
    where("date", ">=", start)
  );
  const snap = await getDocs(q);
  return snap.docs.filter((doc) => {
    const status = (doc.data().status as string | undefined) ?? "booked";
    return status === "booked" || status === "done";
  }).length;
}

/**
 * Cancel an appointment as a store admin.
 * Sets status to "cancelled" on both docs, then writes a cancellation notification
 * to the customer's notifications subcollection so the mobile apps can surface a dialog.
 */
export async function cancelAppointment(
  storeId: string,
  appointmentId: string,
  customerUserId: string
): Promise<void> {
  await updateDoc(aptDoc(storeId, appointmentId), {status: "cancelled"});
  try {
    await updateDoc(userAptDoc(customerUserId, appointmentId), {status: "cancelled"});
  } catch {
    // mirror may not exist, ignore
  }

  // Write cancellation notification so mobile dashboards can show a dialog.
  if (!customerUserId) return;
  try {
    const [aptSnap, storeSnap] = await Promise.all([
      getDoc(aptDoc(storeId, appointmentId)),
      getDoc(doc(db, STORES, storeId)),
    ]);
    const aptData = aptSnap.data() ?? {};
    const storeData = storeSnap.data() ?? {};
    await addDoc(
      collection(db, USERS, customerUserId, "notifications"),
      {
        type: "appointmentCancelledByStore",
        appointmentId,
        storeId,
        storeName: (aptData.storeName as string) ?? "",
        storePhone: (storeData.phone as string) ?? "",
        serviceTitle: (aptData.serviceTitle as string) ?? "",
        date: (aptData.date as string) ?? "",
        timeSlot: (aptData.timeSlot as string) ?? "",
        acknowledged: false,
        createdAt: serverTimestamp(),
      }
    );
  } catch (err) {
    // Non-critical — cancellation already succeeded, but log so it's not invisible.
    console.warn("cancelAppointment: failed to write notification doc", err);
  }
}

/** Mark an appointment as completed on both the store doc and customer mirror. */
export async function markAppointmentDone(
  storeId: string,
  appointmentId: string,
  customerUserId: string
): Promise<void> {
  const doneData = {status: "done", completedAt: serverTimestamp()};
  await updateDoc(aptDoc(storeId, appointmentId), doneData);
  if (!customerUserId) return;
  try {
    await updateDoc(userAptDoc(customerUserId, appointmentId), doneData);
  } catch {
    // mirror may not exist, ignore
  }
}

/** Returns info about which employees are already booked at a given date/timeSlot. */
export async function getBookedSlotInfo(
  storeId: string,
  date: string,
  timeSlot: string
): Promise<{bookedEmployeeIds: Set<string>; hasAnyProviderBooking: boolean}> {
  const q = query(
    aptCol(storeId),
    where("date", "==", date),
    where("status", "==", "booked")
  );
  const snap = await getDocs(q);
  const bookedEmployeeIds = new Set<string>();
  let hasAnyProviderBooking = false;

  const [slotH, slotM] = timeSlot.split(":").map(Number);
  const slotMinutes = slotH * 60 + slotM;

  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.isSpecialRequest === true && data.approvalStatus !== "approved") {
      return;
    }
    const ts: string = (data.timeSlot as string) ?? "";
    const dur: number = (data.durationMinutes as number) ?? 60;
    const empId: string = (data.employeeId as string) ?? "";
    const [h, m] = ts.split(":").map(Number);
    const start = h * 60 + m;
    const end = start + dur;
    // overlaps if slotMinutes falls within [start, end)
    if (slotMinutes >= start && slotMinutes < end) {
      if (empId) bookedEmployeeIds.add(empId);
      else hasAnyProviderBooking = true;
    }
  });

  return {bookedEmployeeIds, hasAnyProviderBooking};
}

/** Get all booked appointments for a date (used for slot availability calculation). */
export async function getAppointmentsForDate(storeId: string, date: string) {
  const q = query(
    aptCol(storeId),
    where("date", "==", date),
    where("status", "==", "booked")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      employeeId: (data.employeeId as string) ?? "",
      timeSlot: (data.timeSlot as string) ?? "",
      durationMinutes: (data.durationMinutes as number) ?? 60,
    };
  });
}

/**
 * Fetch full appointment details for a single calendar day.
 * Uses a simple equality filter on `date` so no composite Firestore index is needed.
 * Cancelled appointments are filtered client-side.
 */
export async function getCalendarAppointments(
  storeId: string,
  date: string
): Promise<SavedAppointment[]> {
  const q = query(aptCol(storeId), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, storeId, d.data()))
    .filter((a) => a.status === "booked");
}

export function subscribeCalendarAppointments(
  storeId: string,
  date: string,
  onNext: (appointments: SavedAppointment[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(aptCol(storeId), where("date", "==", date));
  return onSnapshot(
    q,
    (snap) => {
      onNext(
        snap.docs
          .map((d) => mapAppointment(d.id, storeId, d.data()))
          .filter((a) => a.status === "booked")
      );
    },
    onError
  );
}

/**
 * All pending Special Requests for a store across every date.
 *
 * Implementation detail: we query only on `isSpecialRequest == true` and
 * filter by approval status client-side. This is intentional so that any
 * doc written by a client that set `isSpecialRequest=true` but (due to a
 * bug or partial write) didn't set `approvalStatus` still shows up in the
 * admin's Special Requests column instead of getting silently routed to
 * the Unassigned column. Missing/empty approvalStatus is treated as
 * "pending" — the only states we exclude are "approved" and "rejected".
 */
export async function getPendingSpecialRequests(
  storeId: string
): Promise<SavedAppointment[]> {
  const q = query(
    aptCol(storeId),
    where("isSpecialRequest", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, storeId, d.data()))
    .filter((a) => {
      if (a.status === "cancelled") return false;
      const s = a.approvalStatus ?? "";
      return s !== "approved" && s !== "rejected";
    })
    .sort((a, b) =>
      a.date !== b.date ?
        a.date.localeCompare(b.date) :
        a.timeSlot.localeCompare(b.timeSlot)
    );
}

export function subscribePendingSpecialRequests(
  storeId: string,
  onNext: (appointments: SavedAppointment[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(
    aptCol(storeId),
    where("isSpecialRequest", "==", true)
  );
  return onSnapshot(
    q,
    (snap) => {
      onNext(
        snap.docs
          .map((d) => mapAppointment(d.id, storeId, d.data()))
          .filter((a) => {
            if (a.status === "cancelled") return false;
            const s = a.approvalStatus ?? "";
            return s !== "approved" && s !== "rejected";
          })
          .sort((a, b) =>
            a.date !== b.date ?
              a.date.localeCompare(b.date) :
              a.timeSlot.localeCompare(b.timeSlot)
          )
      );
    },
    onError
  );
}

/** Customer dismisses a rejected Special Request from their dashboard. */
export async function dismissRejectedSpecialRequest(
  uid: string,
  appointmentId: string
): Promise<void> {
  await updateDoc(userAptDoc(uid, appointmentId), {dismissedByCustomer: true});
}

/** Validate that none of the appointments in the cart conflict with existing bookings. Returns indices of conflicts. */
export async function validateAppointmentsAvailability(
  appointments: BookingAppointment[]
): Promise<number[]> {
  const conflicts: number[] = [];
  for (let i = 0; i < appointments.length; i++) {
    const apt = appointments[i];
    if (apt.isSpecialRequest) continue;
    const {bookedEmployeeIds, hasAnyProviderBooking} = await getBookedSlotInfo(
      apt.storeId,
      apt.date,
      apt.timeSlot
    );
    let isConflict = false;
    if (!apt.employeeId) {
      // "Any provider" — conflict if all eligible employees are booked or there's an any-provider booking
      isConflict = hasAnyProviderBooking;
    } else {
      isConflict = bookedEmployeeIds.has(apt.employeeId);
    }
    if (isConflict) conflicts.push(i);
  }
  return conflicts;
}

/** Get all booked appointments for a date range (for the Store Calendar week view). */
export async function getAppointmentsForWeek(
  storeId: string,
  startDate: string,
  endDate: string
): Promise<SavedAppointment[]> {
  const q = query(
    aptCol(storeId),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    where("status", "==", "booked"),
    orderBy("date"),
    orderBy("timeSlot")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAppointment(d.id, storeId, d.data()));
}

/** Get booked appointments for any reporting date range. */
export async function getAppointmentsForRange(
  storeId: string,
  startDate: string,
  endDate: string
): Promise<SavedAppointment[]> {
  const q = query(
    aptCol(storeId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapAppointment(d.id, storeId, d.data()))
    .filter((a) => isRevenueAppointmentStatus(a.status))
    .sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`));
}

/** Get a single appointment from the store's collection. */
export async function getAppointment(storeId: string, appointmentId: string): Promise<SavedAppointment | null> {
  const snap = await getDoc(aptDoc(storeId, appointmentId));
  if (!snap.exists()) return null;
  return mapAppointment(snap.id, storeId, snap.data());
}

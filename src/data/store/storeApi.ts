import {
  collection,
  doc,
  deleteField,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import {db} from "../../core/firebase/firebase";
import type {Store, Employee, Service, ScheduleDay, PersonalSlot} from "../../domain/models/Store";
import {DEFAULT_SERVICES} from "./defaultServices";
import {getAppointmentsForDate} from "../appointmentApi";

const STORES = "stores";
const EMPLOYEES = "employees";
const SERVICES = "services";
const SCHEDULES = "schedules";

function storesCol() {
  return collection(db, STORES);
}

function storeDoc(storeId: string) {
  return doc(db, STORES, storeId);
}

function employeesCol(storeId: string) {
  return collection(db, STORES, storeId, EMPLOYEES);
}

function employeeDoc(storeId: string, employeeId: string) {
  return doc(db, STORES, storeId, EMPLOYEES, employeeId);
}

function servicesCol(storeId: string) {
  return collection(db, STORES, storeId, SERVICES);
}

function serviceDoc(storeId: string, serviceId: string) {
  return doc(db, STORES, storeId, SERVICES, serviceId);
}

function schedulesCol(storeId: string) {
  return collection(db, STORES, storeId, SCHEDULES);
}

function scheduleDoc(storeId: string, employeeId: string, date: string) {
  return doc(db, STORES, storeId, SCHEDULES, `${employeeId}_${date}`);
}

function docToStore(id: string, d: Record<string, unknown>): Store {
  return {
    id,
    storeAdminId: (d.storeAdminId as string) ?? id,
    businessName: (d.businessName as string) ?? "",
    address: (d.address as string) ?? "",
    city: (d.city as string) ?? "",
    state: (d.state as string) ?? "",
    zip: (d.zip as string) ?? "",
    phone: (d.phone as string) ?? "",
    email: (d.email as string) ?? "",
    isDemoStore: (d.isDemoStore as boolean) ?? false,
    isEnabled: d.isEnabled === false ? false : true,
    status: (d.status as string) ?? undefined,
  };
}

export async function isAddressTaken(address: string, city: string, state: string, zip: string): Promise<boolean> {
  const snap = await getDocs(storesCol());
  const addr = address.trim().toLowerCase();
  const c = city.trim().toLowerCase();
  const s = state.trim().toLowerCase();
  const z = zip.trim().toLowerCase();
  return snap.docs.some((d) => {
    const data = d.data();
    return (
      (data.address as string ?? "").trim().toLowerCase() === addr &&
      (data.city as string ?? "").trim().toLowerCase() === c &&
      (data.state as string ?? "").trim().toLowerCase() === s &&
      (data.zip as string ?? "").trim().toLowerCase() === z
    );
  });
}

export async function getOrCreateStore(
  storeAdminId: string,
  businessName: string,
  address: string,
  city = "",
  state = "",
  zip = "",
): Promise<Store> {
  const ref = storeDoc(storeAdminId);
  const snap = await getDoc(ref);
  if (snap.exists()) return docToStore(snap.id, snap.data());

  // Never create a blank store record — require at least a business name or address.
  const name = businessName.trim();
  const addr = address.trim();
  if (name === "" && addr === "") {
    return {id: storeAdminId, storeAdminId, businessName: "", address: ""};
  }
  const data: Record<string, string> = {storeAdminId, businessName: name, address: addr};
  if (city.trim()) data.city = city.trim();
  if (state.trim()) data.state = state.trim();
  if (zip.trim()) data.zip = zip.trim();
  await setDoc(ref, data);
  return {id: ref.id, storeAdminId, businessName: name, address: addr, city: city.trim(), state: state.trim(), zip: zip.trim()};
}

export async function getStore(storeId: string): Promise<Store | null> {
  const snap = await getDoc(storeDoc(storeId));
  if (!snap.exists()) return null;
  return docToStore(snap.id, snap.data());
}

/** Search stores by query (name, address). Excludes disabled stores.
 *  Demo stores are always included regardless of isEnabled.
 *  Stores with no name and no address are always hidden. */
export async function searchStores(q: string): Promise<Store[]> {
  const snap = await getDocs(storesCol());
  const lower = q.trim().toLowerCase();
  return snap.docs
    .map((d) => docToStore(d.id, d.data()))
    .filter((s) => s.isEnabled !== false || s.isDemoStore === true)
    .filter((s) => s.businessName.trim() !== "" || s.address.trim() !== "")
    .filter((s) =>
      lower === "" ||
      s.businessName.toLowerCase().includes(lower) ||
      s.address.toLowerCase().includes(lower) ||
      (s.city ?? "").toLowerCase().includes(lower) ||
      (s.state ?? "").toLowerCase().includes(lower) ||
      (s.zip ?? "").toLowerCase().includes(lower)
    );
}

/** List ALL stores (for superadmin). Includes disabled stores. */
export async function listAllStores(): Promise<Store[]> {
  const snap = await getDocs(storesCol());
  return snap.docs.map((d) => docToStore(d.id, d.data()));
}

/**
 * Get all stores owned by a given store admin (primary + additional).
 * Results include disabled stores so the admin can always manage their own stores.
 */
export async function getStoresForAdmin(storeAdminId: string): Promise<Store[]> {
  const [ownedSnap, invitedSnap] = await Promise.all([
    getDocs(query(storesCol(), where("storeAdminId", "==", storeAdminId))),
    getDocs(query(storesCol(), where("adminUids", "array-contains", storeAdminId))),
  ]);
  const storesById = new Map<string, Store>();
  ownedSnap.docs.forEach((d) => storesById.set(d.id, docToStore(d.id, d.data())));
  invitedSnap.docs.forEach((d) => storesById.set(d.id, docToStore(d.id, d.data())));
  const stores = Array.from(storesById.values());
  // Sort so the primary store (id === storeAdminId) always comes first.
  return stores.sort((a, b) => {
    if (a.id === storeAdminId) return -1;
    if (b.id === storeAdminId) return 1;
    return a.businessName.localeCompare(b.businessName);
  });
}

export async function getEmployeeStoresForUser(uid: string): Promise<Array<{store: Store; employee: Employee}>> {
  const storesSnap = await getDocs(storesCol());
  const result: Array<{store: Store; employee: Employee}> = [];
  for (const storeSnap of storesSnap.docs) {
    const employeesSnap = await getDocs(employeesCol(storeSnap.id));
    const employeeSnap = employeesSnap.docs.find((docSnap) => docSnap.data().accountUid === uid);
    if (!employeeSnap) continue;
    const d = employeeSnap.data();
    result.push({
      store: docToStore(storeSnap.id, storeSnap.data()),
      employee: {
        id: employeeSnap.id,
        firstName: (d.firstName as string) ?? "",
        lastName: (d.lastName as string) ?? "",
        accountEmail: (d.accountEmail as string) ?? "",
        accountUid: (d.accountUid as string) ?? "",
        serviceIds: Array.isArray(d.serviceIds) ? (d.serviceIds as string[]) : [],
      },
    });
  }
  return result;
}

/**
 * Create an additional store for a store admin without a new login.
 * The store gets an auto-generated ID and is linked via storeAdminId.
 */
export async function createAdditionalStore(
  storeAdminId: string,
  businessName: string,
  address: string
): Promise<Store> {
  const name = businessName.trim();
  const addr = address.trim();
  if (name === "" && addr === "") {
    throw new Error("Store must have at least a business name or address.");
  }
  const ref = await addDoc(storesCol(), {
    storeAdminId,
    businessName: name,
    address: addr,
    isEnabled: true,
  });
  return {id: ref.id, storeAdminId, businessName: name, address: addr, isEnabled: true};
}

/** Soft-delete a store: sets status to "deleted" and disables it. */
export async function deleteStore(storeId: string): Promise<void> {
  await updateDoc(storeDoc(storeId), {status: "deleted", isEnabled: false});
}

/**
 * Restore a soft-deleted store. Removes the `status` field so the store
 * stops being filtered out of the Active/Inactive tabs, but leaves it
 * disabled — the superadmin must re-enable it explicitly via the toggle.
 */
export async function restoreStore(storeId: string): Promise<void> {
  await updateDoc(storeDoc(storeId), {status: deleteField()});
}

/** Toggle a store's enabled status (superadmin only). */
export async function setStoreEnabled(storeId: string, isEnabled: boolean): Promise<void> {
  await updateDoc(storeDoc(storeId), {isEnabled});
}

export async function listEmployees(storeId: string): Promise<Employee[]> {
  const snap = await getDocs(employeesCol(storeId));
  return snap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      firstName: (d.firstName as string) ?? "",
      lastName: (d.lastName as string) ?? "",
      accountEmail: (d.accountEmail as string) ?? "",
      accountUid: (d.accountUid as string) ?? "",
      serviceIds: Array.isArray(d.serviceIds) ? (d.serviceIds as string[]) : [],
    };
  });
}

export async function getEmployee(storeId: string, employeeId: string): Promise<Employee | null> {
  const snap = await getDoc(employeeDoc(storeId, employeeId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    firstName: (d.firstName as string) ?? "",
    lastName: (d.lastName as string) ?? "",
    accountEmail: (d.accountEmail as string) ?? "",
    accountUid: (d.accountUid as string) ?? "",
    serviceIds: Array.isArray(d.serviceIds) ? (d.serviceIds as string[]) : [],
  };
}

export async function addEmployee(
  storeId: string,
  firstName: string,
  lastName: string,
  serviceIds: string[],
  accountEmail = ""
): Promise<string> {
  const ref = await addDoc(employeesCol(storeId), {
    firstName,
    lastName,
    accountEmail: accountEmail.trim().toLowerCase(),
    serviceIds,
  });
  return ref.id;
}

export async function updateEmployee(
  storeId: string,
  employeeId: string,
  firstName: string,
  lastName: string,
  serviceIds: string[],
  accountEmail = ""
): Promise<void> {
  await updateDoc(employeeDoc(storeId, employeeId), {
    firstName,
    lastName,
    accountEmail: accountEmail.trim().toLowerCase(),
    serviceIds,
  });
}

export async function listServices(storeId: string): Promise<Service[]> {
  const snap = await getDocs(servicesCol(storeId));
  if (snap.empty) {
    await seedDefaultServices(storeId);
    return listServices(storeId);
  }
  return snap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      icon: (d.icon as string) ?? "",
      title: (d.title as string) ?? "",
      description: (d.description as string) ?? "",
      durationMinutes: d.durationMinutes != null ? Number(d.durationMinutes) : null,
      priceCents: d.priceCents != null ? Number(d.priceCents) : null,
      rewardsPoints: d.rewardsPoints != null ? Number(d.rewardsPoints) : 0,
      isActive: (d.isActive as boolean) ?? false,
    };
  });
}

export async function seedDefaultServices(storeId: string): Promise<void> {
  const col = servicesCol(storeId);
  for (const [icon, title, description] of DEFAULT_SERVICES) {
    await addDoc(col, {
      icon,
      title,
      description,
      durationMinutes: null,
      priceCents: null,
      isActive: false,
    });
  }
}

export async function getService(storeId: string, serviceId: string): Promise<Service | null> {
  const snap = await getDoc(serviceDoc(storeId, serviceId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    icon: (d.icon as string) ?? "",
    title: (d.title as string) ?? "",
    description: (d.description as string) ?? "",
    durationMinutes: d.durationMinutes != null ? Number(d.durationMinutes) : null,
    priceCents: d.priceCents != null ? Number(d.priceCents) : null,
    rewardsPoints: d.rewardsPoints != null ? Number(d.rewardsPoints) : 0,
    isActive: (d.isActive as boolean) ?? false,
  };
}

export async function addService(
  storeId: string,
  icon: string,
  title: string,
  description: string,
  durationMinutes: number | null,
  priceCents: number | null,
  rewardsPoints: number,
  isActive: boolean
): Promise<string> {
  const ref = await addDoc(servicesCol(storeId), {
    icon, title, description, durationMinutes, priceCents, rewardsPoints, isActive,
  });
  return ref.id;
}

export async function updateService(
  storeId: string,
  serviceId: string,
  icon: string,
  title: string,
  description: string,
  durationMinutes: number | null,
  priceCents: number | null,
  rewardsPoints: number,
  isActive: boolean
): Promise<void> {
  await updateDoc(serviceDoc(storeId, serviceId), {
    icon, title, description, durationMinutes, priceCents, rewardsPoints, isActive,
  });
}

export async function deleteService(storeId: string, serviceId: string): Promise<void> {
  await deleteDoc(serviceDoc(storeId, serviceId));
}

export async function getScheduleDay(
  storeId: string,
  employeeId: string,
  date: string
): Promise<ScheduleDay | null> {
  const snap = await getDoc(scheduleDoc(storeId, employeeId, date));
  if (!snap.exists()) return null;
  const d = snap.data();
  const personalSlotsRaw = d.personalSlots as Array<{ start: string; end: string }> | undefined;
  const personalSlots = Array.isArray(personalSlotsRaw)
    ? personalSlotsRaw.filter((s) => s && typeof s.start === "string" && typeof s.end === "string")
    : undefined;
  const lunchStart = (d.lunchStart as string) ?? null;
  const lunchEnd = (d.lunchEnd as string) ?? null;
  return {
    employeeId,
    date,
    workStart: (d.workStart as string) ?? null,
    workEnd: (d.workEnd as string) ?? null,
    lunchStart,
    lunchEnd,
    breakStart: (d.breakStart as string) ?? null,
    breakEnd: (d.breakEnd as string) ?? null,
    personalStart: (d.personalStart as string) ?? null,
    personalEnd: (d.personalEnd as string) ?? null,
    personalSlots: personalSlots?.length ? personalSlots : (lunchStart && lunchEnd ? [{ start: lunchStart, end: lunchEnd }] : undefined),
  };
}

export async function setScheduleDay(storeId: string, day: ScheduleDay): Promise<void> {
  const slots = day.personalSlots && day.personalSlots.length > 0
    ? day.personalSlots
    : (day.lunchStart && day.lunchEnd ? [{ start: day.lunchStart, end: day.lunchEnd }] : undefined);
  const firstPersonal = slots && slots.length > 0 ? slots[0] : null;
  await setDoc(scheduleDoc(storeId, day.employeeId, day.date), {
    employeeId: day.employeeId,
    date: day.date,
    workStart: day.workStart,
    workEnd: day.workEnd,
    lunchStart: firstPersonal?.start ?? day.lunchStart,
    lunchEnd: firstPersonal?.end ?? day.lunchEnd,
    breakStart: day.breakStart,
    breakEnd: day.breakEnd,
    personalStart: day.personalStart,
    personalEnd: day.personalEnd,
    ...(slots && slots.length > 0 ? { personalSlots: slots } : {}),
  });
}

// ─── Scheduling helpers ────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Returns available time slots (HH:mm) for a service at a store on a given date.
 * Generates 30-min increments across working employees, excludes personal time,
 * past times (if today), and already-booked slots.
 */
export async function getAvailableTimeSlots(
  storeId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  const employees = await listEmployees(storeId);
  const eligible = employees.filter((e) => e.serviceIds.includes(serviceId));
  if (eligible.length === 0) return [];

  const service = await getService(storeId, serviceId);
  const duration = service?.durationMinutes ?? 60;

  // Load schedules for eligible employees
  const schedules: Array<{employeeId: string; schedule: ScheduleDay}> = [];
  for (const emp of eligible) {
    const sched = await getScheduleDay(storeId, emp.id, date);
    if (sched && sched.workStart && sched.workEnd) {
      schedules.push({employeeId: emp.id, schedule: sched});
    }
  }
  if (schedules.length === 0) return [];

  // Load existing booked appointments for the date
  const booked = await getAppointmentsForDate(storeId, date);

  const isToday = date === todayString();
  const nowMinutes = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : 0;

  const slotSet = new Set<string>();

  for (const {employeeId, schedule} of schedules) {
    const workStart = toMinutes(schedule.workStart!);
    const workEnd = toMinutes(schedule.workEnd!);
    const personalSlots = schedule.personalSlots ?? [];

    // Generate 30-min slots that fit the service duration before workEnd
    for (let t = workStart; t + duration <= workEnd; t += 30) {
      const slotEnd = t + duration;

      // Skip past slots if today
      if (isToday && t <= nowMinutes) continue;

      // Skip if slot overlaps any personal time
      const overlapsPersonal = personalSlots.some((ps) => {
        const psStart = toMinutes(ps.start);
        const psEnd = toMinutes(ps.end);
        return t < psEnd && slotEnd > psStart;
      });
      if (overlapsPersonal) continue;

      // Check if this employee has a conflicting appointment
      const isBooked = booked.some((apt) => {
        if (apt.employeeId !== employeeId && apt.employeeId !== "") return false;
        const aptStart = toMinutes(apt.timeSlot);
        const aptEnd = aptStart + apt.durationMinutes;
        return t < aptEnd && slotEnd > aptStart;
      });
      if (!isBooked) slotSet.add(toHHMM(t));
    }
  }

  return [...slotSet].sort();
}

/**
 * Returns employees available to perform a service at a given date + time slot.
 * Excludes already-booked employees and optionally a set of extra excluded IDs.
 */
export async function getAvailableEmployeesForSlot(
  storeId: string,
  serviceId: string,
  date: string,
  timeSlot: string,
  excludeEmployeeIds: string[] = []
): Promise<Employee[]> {
  const employees = await listEmployees(storeId);
  const eligible = employees.filter(
    (e) => e.serviceIds.includes(serviceId) && !excludeEmployeeIds.includes(e.id)
  );

  const service = await getService(storeId, serviceId);
  const duration = service?.durationMinutes ?? 60;
  const slotStart = toMinutes(timeSlot);
  const slotEnd = slotStart + duration;

  const booked = await getAppointmentsForDate(storeId, date);
  const available: Employee[] = [];

  for (const emp of eligible) {
    const sched = await getScheduleDay(storeId, emp.id, date);
    if (!sched?.workStart || !sched?.workEnd) continue;

    const workStart = toMinutes(sched.workStart);
    const workEnd = toMinutes(sched.workEnd);
    if (slotStart < workStart || slotEnd > workEnd) continue;

    // Check personal time overlap
    const personalSlots = sched.personalSlots ?? [];
    const overlapsPersonal = personalSlots.some((ps) => {
      const psStart = toMinutes(ps.start);
      const psEnd = toMinutes(ps.end);
      return slotStart < psEnd && slotEnd > psStart;
    });
    if (overlapsPersonal) continue;

    // Check booking conflicts
    const isBooked = booked.some((apt) => {
      if (apt.employeeId !== emp.id && apt.employeeId !== "") return false;
      const aptStart = toMinutes(apt.timeSlot);
      const aptEnd = aptStart + apt.durationMinutes;
      return slotStart < aptEnd && slotEnd > aptStart;
    });
    if (!isBooked) available.push(emp);
  }

  return available;
}

export async function getAvailableTimeSlotsForProvider(
  storeId: string,
  employeeId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  const service = await getService(storeId, serviceId);
  const duration = service?.durationMinutes ?? 60;
  const sched = await getScheduleDay(storeId, employeeId, date);
  if (!sched?.workStart || !sched.workEnd) return [];

  const employee = await getEmployee(storeId, employeeId);
  if (!employee?.serviceIds.includes(serviceId)) return [];

  const booked = await getAppointmentsForDate(storeId, date);
  const isToday = date === todayString();
  const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
  const slots: string[] = [];
  const workStart = toMinutes(sched.workStart);
  const workEnd = toMinutes(sched.workEnd);
  const personalSlots = sched.personalSlots ?? [];

  for (let t = workStart; t + duration <= workEnd; t += 30) {
    const slotEnd = t + duration;
    if (isToday && t <= nowMinutes) continue;
    const overlapsPersonal = personalSlots.some((ps) => {
      const psStart = toMinutes(ps.start);
      const psEnd = toMinutes(ps.end);
      return t < psEnd && slotEnd > psStart;
    });
    if (overlapsPersonal) continue;

    const isBooked = booked.some((apt) => {
      if (apt.employeeId !== employeeId && apt.employeeId !== "") return false;
      const aptStart = toMinutes(apt.timeSlot);
      const aptEnd = aptStart + apt.durationMinutes;
      return t < aptEnd && slotEnd > aptStart;
    });
    if (!isBooked) slots.push(toHHMM(t));
  }

  return slots;
}

export async function getProviderAvailableDates(
  storeId: string,
  employeeId: string,
  serviceId: string,
  startDate: Date,
  dayCount = 35
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result[key] = (await getAvailableTimeSlotsForProvider(storeId, employeeId, serviceId, key)).length > 0;
  }
  return result;
}

/** Count how many employees are scheduled to work on a given date. */
export async function getStaffWorkingCount(storeId: string, date: string): Promise<number> {
  const employees = await listEmployees(storeId);
  let count = 0;
  for (const emp of employees) {
    const sched = await getScheduleDay(storeId, emp.id, date);
    if (sched?.workStart && sched?.workEnd) count++;
  }
  return count;
}

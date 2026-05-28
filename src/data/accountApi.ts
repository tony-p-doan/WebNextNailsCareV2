import {collection, doc, getDoc, setDoc, updateDoc} from "firebase/firestore";
import {db} from "../core/firebase/firebase";

const STORE_ACCOUNTS = "storeAccounts";

export interface StoreAccount {
  storeId: string;
  status: "active" | "inactive";
  lastPaymentDate: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export async function getStoreAccount(storeId: string): Promise<StoreAccount | null> {
  const snap = await getDoc(doc(db, STORE_ACCOUNTS, storeId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    storeId,
    status: (d.status as "active" | "inactive") ?? "inactive",
    lastPaymentDate: (d.lastPaymentDate as string) || null,
    stripeCustomerId: d.stripeCustomerId as string | undefined,
    stripeSubscriptionId: d.stripeSubscriptionId as string | undefined,
  };
}

export async function upsertStoreAccount(storeId: string, data: Partial<StoreAccount>): Promise<void> {
  const ref = doc(db, STORE_ACCOUNTS, storeId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {...data});
  } else {
    await setDoc(ref, {storeId, status: "inactive", lastPaymentDate: null, ...data});
  }
}

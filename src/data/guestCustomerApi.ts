import {collection, addDoc, serverTimestamp} from "firebase/firestore";
import {db} from "../core/firebase/firebase";

const GUEST_CUSTOMERS = "guestCustomers";

export interface GuestCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  storeId: string;
}

export async function createGuestCustomer(data: {
  firstName: string;
  lastName: string;
  phone: string;
  storeId: string;
}): Promise<GuestCustomer> {
  const ref = await addDoc(collection(db, GUEST_CUSTOMERS), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return {id: ref.id, ...data};
}

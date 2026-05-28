import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import {db} from "../core/firebase/firebase";

export interface AdminAccessNotice {
  id: string;
  storeId: string;
  storeName: string;
}

export async function listPendingAdminAccessNotices(uid: string): Promise<AdminAccessNotice[]> {
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "adminAccessNotices"),
      where("acknowledged", "==", false)
    )
  );
  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      storeId: (data.storeId as string) || docSnap.id,
      storeName: (data.storeName as string) || "this store",
    };
  });
}

export async function acknowledgeAdminAccessNotice(uid: string, noticeId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid, "adminAccessNotices", noticeId), {
    acknowledged: true,
  });
}

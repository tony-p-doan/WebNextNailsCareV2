import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {db} from "../core/firebase/firebase";
import type {SpecialOffer} from "../domain/models/SpecialOffer";

const STORES = "stores";
const SPECIAL_OFFERS = "specialOffers";

function specialOffersCol(storeId: string) {
  return collection(db, STORES, storeId, SPECIAL_OFFERS);
}

function specialOfferDoc(storeId: string, offerId: string) {
  return doc(db, STORES, storeId, SPECIAL_OFFERS, offerId);
}

function mapOffer(id: string, data: Record<string, unknown>): SpecialOffer {
  return {
    id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    dollarValueCents:
      typeof data.dollarValueCents === "number" ? data.dollarValueCents : null,
    pointsRequired: (data.pointsRequired as number) ?? 0,
    memberTier: data.memberTier === "platinum" ? "platinum" : "gold",
    isEnabled: data.isEnabled !== false,
  };
}

export async function listSpecialOffers(storeId: string): Promise<SpecialOffer[]> {
  const snap = await getDocs(query(specialOffersCol(storeId), orderBy("title")));
  return snap.docs.map((d) => mapOffer(d.id, d.data()));
}

export async function getSpecialOffer(
  storeId: string,
  offerId: string
): Promise<SpecialOffer | null> {
  const snap = await getDoc(specialOfferDoc(storeId, offerId));
  return snap.exists() ? mapOffer(snap.id, snap.data()) : null;
}

export async function addSpecialOffer(
  storeId: string,
  data: Omit<SpecialOffer, "id">
): Promise<string> {
  const ref = await addDoc(specialOffersCol(storeId), data);
  return ref.id;
}

export async function updateSpecialOffer(
  storeId: string,
  offerId: string,
  data: Omit<SpecialOffer, "id">
): Promise<void> {
  await updateDoc(specialOfferDoc(storeId, offerId), data as Record<string, unknown>);
}

export async function deleteSpecialOffer(
  storeId: string,
  offerId: string
): Promise<void> {
  await deleteDoc(specialOfferDoc(storeId, offerId));
}

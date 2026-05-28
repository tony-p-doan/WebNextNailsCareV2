import {collection, doc, getDoc, getDocs, orderBy, query, where} from "firebase/firestore";
import {httpsCallable} from "firebase/functions";
import {db, functions} from "../core/firebase/firebase";
import type {ProviderRating, ProviderRatingStatus, ProviderRatingSummary} from "../domain/models/ProviderRating";

function ratingsCol(storeId: string) {
  return collection(db, "stores", storeId, "providerRatings");
}

function summariesCol(storeId: string) {
  return collection(db, "stores", storeId, "providerRatingSummaries");
}

function toRating(id: string, data: Record<string, unknown>): ProviderRating {
  return {
    id,
    storeId: (data.storeId as string) ?? "",
    appointmentId: (data.appointmentId as string) ?? "",
    providerId: (data.providerId as string) ?? "",
    providerName: (data.providerName as string) ?? "",
    customerId: (data.customerId as string) ?? "",
    customerName: (data.customerName as string) ?? "",
    rating: Number(data.rating ?? 0),
    comment: (data.comment as string) ?? "",
    privateFeedback: (data.privateFeedback as string) ?? "",
    tags: Array.isArray(data.tags) ? data.tags as string[] : [],
    isPublic: data.isPublic !== false,
    status: (data.status as ProviderRatingStatus) ?? "pending",
    serviceTitle: data.serviceTitle as string | undefined,
    appointmentDate: data.appointmentDate as string | undefined,
  };
}

export async function submitProviderRating(data: {
  storeId: string;
  appointmentId: string;
  rating: number;
  comment: string;
  privateFeedback: string;
  tags: string[];
  isPublic: boolean;
}): Promise<void> {
  await httpsCallable(functions, "submitProviderRating")(data);
}

export async function moderateProviderRating(storeId: string, ratingId: string, status: ProviderRatingStatus): Promise<void> {
  await httpsCallable(functions, "moderateProviderRating")({storeId, ratingId, status});
}

export async function listProviderRatings(storeId: string): Promise<ProviderRating[]> {
  const snap = await getDocs(query(ratingsCol(storeId), orderBy("appointmentDate", "desc")));
  return snap.docs.map((d) => toRating(d.id, d.data()));
}

export async function listPublishedProviderRatings(storeId: string, providerId: string): Promise<ProviderRating[]> {
  const snap = await getDocs(query(
    ratingsCol(storeId),
    where("providerId", "==", providerId),
    where("status", "==", "published"),
  ));
  return snap.docs.map((d) => toRating(d.id, d.data()));
}

export async function getProviderRatingSummary(storeId: string, providerId: string): Promise<ProviderRatingSummary | null> {
  const snap = await getDoc(doc(summariesCol(storeId), providerId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    providerId,
    ratingAverage: Number(data.ratingAverage ?? 0),
    ratingCount: Number(data.ratingCount ?? 0),
    ratingBreakdown: (data.ratingBreakdown as Record<string, number>) ?? {},
  };
}

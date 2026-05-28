import {collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
import {db} from "../core/firebase/firebase";

export interface ExperienceShare {
  id: string;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storeState: string;
  storeZip: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
  serviceType: string;
  storeId: string;
  isEnabled: boolean;
  createdAt?: {toDate: () => Date};
}

function mapExperienceShare(id: string, data: Record<string, unknown>): ExperienceShare {
  const beforeImageUrl = (data.beforeImageUrl as string) ?? "";
  const afterImageUrl = (data.afterImageUrl as string) ?? "";
  const beforeImageUrls = ((data.beforeImageUrls as string[] | undefined) ?? [beforeImageUrl]).filter(Boolean);
  const afterImageUrls = ((data.afterImageUrls as string[] | undefined) ?? [afterImageUrl]).filter(Boolean);
  return {
    id,
    storeId: (data.storeId as string) ?? "",
    storeName: (data.storeName as string) ?? "",
    storeAddress: (data.storeAddress as string) ?? "",
    storeCity: (data.storeCity as string) ?? "",
    storeState: (data.storeState as string) ?? "",
    storeZip: (data.storeZip as string) ?? "",
    beforeImageUrl: beforeImageUrls[0] ?? "",
    afterImageUrl: afterImageUrls[0] ?? "",
    beforeImageUrls,
    afterImageUrls,
    serviceType: (data.serviceType as string) ?? "",
    isEnabled: (data.isEnabled as boolean | undefined) ?? true,
    createdAt: data.createdAt as ExperienceShare["createdAt"],
  };
}

export async function getExperienceShare(shareId: string): Promise<ExperienceShare | null> {
  const snap = await getDoc(doc(db, "experienceShares", shareId));
  if (!snap.exists()) return null;
  return mapExperienceShare(snap.id, snap.data());
}

export async function listExperienceSharesForStore(storeId: string): Promise<ExperienceShare[]> {
  const snap = await getDocs(query(collection(db, "experienceShares"), where("storeId", "==", storeId)));
  return snap.docs
    .map((item) => mapExperienceShare(item.id, item.data()))
    .filter((item) => item.isEnabled)
    .sort((a, b) => {
      const ad = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
      const bd = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
      return bd - ad;
    });
}

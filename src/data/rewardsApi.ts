import {collection, doc, addDoc, getDocs, updateDoc, deleteDoc} from "firebase/firestore";
import {db} from "../core/firebase/firebase";
import type {RewardRule} from "../domain/models/RewardRule";

const STORES = "stores";
const REWARDS = "rewards";

function rewardsCol(storeId: string) {
  return collection(db, STORES, storeId, REWARDS);
}

function rewardDoc(storeId: string, rewardId: string) {
  return doc(db, STORES, storeId, REWARDS, rewardId);
}

export async function listRewards(storeId: string): Promise<RewardRule[]> {
  const snap = await getDocs(rewardsCol(storeId));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      rewardName: (data.rewardName as string) ?? "",
      rewardDescription: (data.rewardDescription as string) ?? "",
      pointsRequired: (data.pointsRequired as number) ?? 0,
      serviceId: (data.serviceId as string) ?? "",
    } satisfies RewardRule;
  });
}

export async function addReward(
  storeId: string,
  data: Omit<RewardRule, "id">
): Promise<string> {
  const ref = await addDoc(rewardsCol(storeId), data);
  return ref.id;
}

export async function updateReward(
  storeId: string,
  rewardId: string,
  data: Omit<RewardRule, "id">
): Promise<void> {
  await updateDoc(rewardDoc(storeId, rewardId), data as Record<string, unknown>);
}

export async function deleteReward(storeId: string, rewardId: string): Promise<void> {
  await deleteDoc(rewardDoc(storeId, rewardId));
}

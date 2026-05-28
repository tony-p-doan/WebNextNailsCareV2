import {doc, getDoc, setDoc} from "firebase/firestore";
import {db} from "../core/firebase/firebase";

export interface RewardStatusSettings {
  platinumAppointmentsRequired: number;
}

function settingsDoc(storeId: string) {
  return doc(db, "stores", storeId, "rewardSettings", "membership");
}

export async function getRewardStatusSettings(
  storeId: string
): Promise<RewardStatusSettings> {
  const snap = await getDoc(settingsDoc(storeId));
  return {
    platinumAppointmentsRequired:
      (snap.data()?.platinumAppointmentsRequired as number | undefined) ?? 0,
  };
}

export async function setRewardStatusSettingsLocal(
  storeId: string,
  platinumAppointmentsRequired: number
): Promise<void> {
  await setDoc(settingsDoc(storeId), {platinumAppointmentsRequired}, {merge: true});
}

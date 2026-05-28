import {httpsCallable} from "firebase/functions";
import {functions} from "../core/firebase/firebase";

interface RewardsResult { sent: number; skipped: number }
interface BroadcastResult { sent: number }

/**
 * Sends personalised rewards-reminder push notifications to all customers.
 * The Cloud Function inspects each customer's appointment history and picks
 * the most relevant reward to highlight.
 */
export async function sendRewardsReminders(): Promise<RewardsResult> {
  const fn = httpsCallable<void, RewardsResult>(
    functions, "sendRewardsReminders",
  );
  const result = await fn();
  return result.data;
}

/**
 * Broadcasts a custom push notification message to every customer that has
 * an FCM token registered.
 * @param message - The notification body text (required, non-empty).
 */
export async function sendBroadcastMessage(
  message: string,
): Promise<BroadcastResult> {
  const fn = httpsCallable<{message: string}, BroadcastResult>(
    functions, "sendBroadcastMessage",
  );
  const result = await fn({message});
  return result.data;
}

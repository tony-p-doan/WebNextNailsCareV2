export interface RewardRule {
  id: string;
  rewardName: string;
  rewardDescription: string;
  pointsRequired: number;
  /** Service that becomes free when reward is applied; empty string = no specific service. */
  serviceId: string;
}

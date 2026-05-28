export type MemberTier = "gold" | "platinum";

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  dollarValueCents: number | null;
  pointsRequired: number;
  memberTier: MemberTier;
  isEnabled: boolean;
}

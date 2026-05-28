export type ProviderRatingStatus = "pending" | "published" | "hidden" | "flagged";

export interface ProviderRating {
  id: string;
  storeId: string;
  appointmentId: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  privateFeedback: string;
  tags: string[];
  isPublic: boolean;
  status: ProviderRatingStatus;
  serviceTitle?: string;
  appointmentDate?: string;
}

export interface ProviderRatingSummary {
  providerId: string;
  ratingAverage: number;
  ratingCount: number;
  ratingBreakdown: Record<string, number>;
}

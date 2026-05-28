import {FunctionsClient} from "../functions/FunctionsClient";

export class StripeSubscriptionClient {
  static async redirectToCheckout(): Promise<void> {
    const url = await FunctionsClient.createCheckoutSession(window.location.origin);
    window.location.href = url;
  }
}

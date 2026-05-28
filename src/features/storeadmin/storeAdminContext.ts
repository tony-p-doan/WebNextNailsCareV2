import {AuthService} from "../../core/auth/AuthService";

const ACTIVE_STORE_KEY = "nnc.activeStoreId";

export function setActiveStoreId(storeId: string): void {
  if (!storeId) return;
  window.localStorage.setItem(ACTIVE_STORE_KEY, storeId);
}

export function clearActiveStoreId(): void {
  window.localStorage.removeItem(ACTIVE_STORE_KEY);
}

export function getActiveStoreId(): string | null {
  return window.localStorage.getItem(ACTIVE_STORE_KEY) || AuthService.getCurrentUser()?.uid || null;
}

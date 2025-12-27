export type Role = "CUSTOMER" | "SHOP_OWNER" | "SHOP_MANAGER" | "PROVIDER";

export function hasRole(userRoles: Role[], required: Role): boolean {
  return userRoles.includes(required);
}

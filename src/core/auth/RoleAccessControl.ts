import type {Role} from "../../domain/models/Role";

export function hasRole(userRoles: Role[], required: Role): boolean {
  return userRoles.includes(required);
}

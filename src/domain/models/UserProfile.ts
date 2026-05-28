import type {Role} from "./Role";

export interface CustomerProfile {
  role: "customer";
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  rewardsPointsByStore?: Record<string, number>;
  rewardsPoints?: number;
}

export interface StoreAdminProfile {
  role: "storeadmin";
  firstName: string;
  lastName: string;
  address: string;
  businessName: string;
  email: string;
  phoneNumber: string;
}

export interface SuperadminProfile {
  role: "superadmin";
  email: string;
}

export interface EmployeeProfile {
  role: "employee";
  roles?: Role[];
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export type UserProfile = CustomerProfile | StoreAdminProfile | SuperadminProfile | EmployeeProfile;

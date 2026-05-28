import {
  createUserWithEmailAndPassword,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  verifyPasswordResetCode,
} from "firebase/auth";
import {httpsCallable} from "firebase/functions";
import {doc, getDoc, setDoc, updateDoc, increment, serverTimestamp} from "firebase/firestore";
import {auth, db, functions} from "../firebase/firebase";
import type {Role} from "../../domain/models/Role";
import type {CustomerProfile, StoreAdminProfile, UserProfile} from "../../domain/models/UserProfile";

const USERS_COLLECTION = "users";

/**
 * Superadmin cannot register; fixed credentials.
 * One-time setup: In Firebase Console (Authentication) create a user with email
 * thytonyadmin@nextnailscare.app and password ManiPediV2. Then in Firestore add
 * users/{that-uid} with { role: "superadmin", email: "thytonyadmin@nextnailscare.app" }.
 */
export const SUPERADMIN_USERNAME = "thytonyadmin";
const SUPERADMIN_EMAIL = "thytonyadmin@nextnailscare.app";

export interface CustomerRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface StoreAdminRegistrationData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface InvitedStoreAdminRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface EmployeeRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export class AuthService {
  /** Map superadmin username to email for Firebase sign-in. */
  private static resolveEmail(emailOrUsername: string): string {
    if (emailOrUsername.trim().toLowerCase() === SUPERADMIN_USERNAME.toLowerCase()) {
      return SUPERADMIN_EMAIL;
    }
    return emailOrUsername.trim();
  }

  static async signIn(emailOrUsername: string, password: string): Promise<User> {
    const email = this.resolveEmail(emailOrUsername);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  static async sendPasswordReset(emailOrUsername: string): Promise<void> {
    const fn = httpsCallable<{emailOrUsername: string}, {email: string}>(
      functions,
      "requestPasswordReset"
    );
    await fn({emailOrUsername: emailOrUsername.trim()});
  }

  static async verifyPasswordResetCode(oobCode: string): Promise<string> {
    return verifyPasswordResetCode(auth, oobCode);
  }

  static async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(auth, oobCode, newPassword);
  }

  static async signUpCustomer(data: CustomerRegistrationData): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const profile: CustomerProfile = {
      role: "customer",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
    };
    await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
    return cred.user;
  }

  static async signUpStoreAdmin(data: StoreAdminRegistrationData): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const uid = cred.user.uid;
    const profile: StoreAdminProfile = {
      role: "storeadmin",
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      businessName: data.businessName,
      email: data.email,
      phoneNumber: data.phoneNumber,
    };
    await setDoc(doc(db, USERS_COLLECTION, uid), profile);
    const coordinates = await this.geocodeStoreAddress(
      data.address,
      data.city,
      data.state,
      data.zip
    );
    // Create store document immediately so address is searchable right away.
    const storeData: Record<string, string | boolean | number | {latitude: number; longitude: number}> = {
      storeAdminId: uid,
      businessName: data.businessName.trim(),
      address: data.address.trim(),
      isEnabled: false,
    };
    if (data.city.trim()) storeData.city = data.city.trim();
    if (data.state.trim()) storeData.state = data.state.trim();
    if (data.zip.trim()) storeData.zip = data.zip.trim();
    if (data.email.trim()) storeData.email = data.email.trim();
    if (data.phoneNumber.trim()) storeData.phone = data.phoneNumber.trim();
    if (coordinates) {
      storeData.latitude = coordinates.latitude;
      storeData.longitude = coordinates.longitude;
      storeData.location = coordinates;
    }
    await setDoc(doc(db, "stores", uid), storeData);
    return cred.user;
  }

  private static async geocodeStoreAddress(
    address: string,
    city: string,
    state: string,
    zip: string
  ): Promise<{latitude: number; longitude: number} | null> {
    try {
      const fn = httpsCallable<
        {address: string; city: string; state: string; zip: string},
        {latitude: number | null; longitude: number | null}
      >(functions, "geocodeStoreAddress");
      const result = await fn({
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
      });
      const {latitude, longitude} = result.data;
      return typeof latitude === "number" && typeof longitude === "number" ?
        {latitude, longitude} :
        null;
    } catch (err) {
      console.warn("Store address geocoding failed", err);
      return null;
    }
  }

  static async signUpInvitedStoreAdmin(data: InvitedStoreAdminRegistrationData): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const profile: StoreAdminProfile = {
      role: "storeadmin",
      firstName: data.firstName,
      lastName: data.lastName,
      address: "",
      businessName: "",
      email: data.email,
      phoneNumber: data.phoneNumber,
    };
    await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
    return cred.user;
  }

  static async signUpEmployee(data: EmployeeRegistrationData): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
      role: "employee",
      roles: ["employee"],
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
    });
    return cred.user;
  }

  static signOut(): Promise<void> {
    return firebaseSignOut(auth);
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  static async getProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  }

  static async getRole(uid: string): Promise<Role | null> {
    const profile = await this.getProfile(uid);
    return profile?.role ?? null;
  }

  static async addCustomerRewardsPoints(uid: string, pointsToAdd: number): Promise<void> {
    if (pointsToAdd <= 0) return;
    await updateDoc(doc(db, USERS_COLLECTION, uid), {rewardsPoints: increment(pointsToAdd)});
  }

  static async getCustomerStoreRewardsPoints(uid: string, storeId: string): Promise<number> {
    if (!uid || !storeId) return 0;
    const ref = doc(db, USERS_COLLECTION, uid, "storeRewards", storeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;
    return (snap.data().points as number) ?? 0;
  }

  static async addCustomerStoreRewardsPoints(uid: string, storeId: string, pointsToAdd: number): Promise<void> {
    if (!uid || !storeId || pointsToAdd <= 0) return;
    await setDoc(
      doc(db, USERS_COLLECTION, uid, "storeRewards", storeId),
      {
        storeId,
        points: increment(pointsToAdd),
        updatedAt: serverTimestamp(),
      },
      {merge: true}
    );
  }
}

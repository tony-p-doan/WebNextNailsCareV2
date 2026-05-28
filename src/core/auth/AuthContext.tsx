import React, {createContext, useCallback, useContext, useEffect, useState} from "react";
import type {User} from "firebase/auth";
import {AuthService} from "./AuthService";
import type {UserProfile} from "../../domain/models/UserProfile";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const initialState: AuthState = {user: null, profile: null, loading: true};

const AuthContext = createContext<AuthState & {
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}>(null as unknown as AuthState & {
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<AuthState>(initialState);

  const refreshProfile = useCallback(async () => {
    const user = AuthService.getCurrentUser();
    if (!user) {
      setState((s) => ({...s, user: null, profile: null}));
      return;
    }
    const profile = await AuthService.getProfile(user.uid);
    setState((s) => ({...s, user, profile}));
  }, []);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange(async (user) => {
      if (!user) {
        setState({user: null, profile: null, loading: false});
        return;
      }
      const profile = await AuthService.getProfile(user.uid);
      setState({user, profile, loading: false});
    });
    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    await AuthService.signIn(emailOrUsername, password);
    await refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setState({user: null, profile: null, loading: false});
  }, []);

  const value = {
    ...state,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

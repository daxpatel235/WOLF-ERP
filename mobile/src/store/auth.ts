/**
 * Auth state. Token is persisted in the OS keystore via expo-secure-store so it
 * survives restarts. When `EXPO_PUBLIC_API_URL` is set (USE_LIVE) sign-in calls
 * the real `server/` /auth endpoints; otherwise it accepts any credentials so
 * the offline demo still works.
 */
import { create } from 'zustand';

import { secureStorage } from './storage';
import { USE_LIVE } from '@/api/client';
import { liveAuth } from '@/api/live';
import type { Role } from '@/types/domain';

const VALID_ROLES: Role[] = ['admin', 'manager', 'approver', 'buyer', 'vendor'];
const asRole = (r: string | undefined, fallback: Role = 'manager'): Role =>
  VALID_ROLES.includes(r as Role) ? (r as Role) : fallback;

const TOKEN_KEY = 'wolf.auth.token';
const USER_KEY = 'wolf.auth.user';

export interface AuthUser {
  name: string;
  email: string;
  role: Role;
  company: string;
}

/** Where each role lands right after sign-in (mirrors web ROLE_HOME). */
export const ROLE_HOME: Record<Role, string> = {
  admin: '/(app)',
  manager: '/(app)',
  approver: '/(app)/approvals',
  buyer: '/(app)',
  vendor: '/(app)/more',
};

interface AuthState {
  hydrated: boolean;
  token: string | null;
  user: AuthUser | null;
  /** True only for the session right after sign-up, so the UI can greet a first-timer. */
  isNewUser: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string, role?: Role) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  hydrated: false,
  token: null,
  user: null,
  isNewUser: false,

  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        secureStorage.getItem(TOKEN_KEY),
        secureStorage.getItem(USER_KEY),
      ]);
      set({
        token,
        user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  signIn: async (email, password, role = 'manager') => {
    let token: string;
    let user: AuthUser;
    if (USE_LIVE) {
      const res = await liveAuth.login(email, password);
      token = res.token;
      user = { name: res.user.name, email: res.user.email, role: asRole(res.user.role), company: res.user.company ?? '' };
    } else {
      // Mock sign-in (accepts any credentials) is a DEV-ONLY convenience. A
      // release build always has a live API_URL, so this branch is unreachable
      // there — guard anyway so a shipped app can never accept a fake login.
      if (!__DEV__) throw new Error('No backend configured for this build.');
      // Mock: derive a friendly name from the email local-part.
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      user = { name: name || 'Wolf User', email, role, company: 'Wolf Industries' };
      token = `mock.${Date.now()}`;
    }
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, token),
      secureStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user, isNewUser: false });
  },

  register: async (name, email, password, role) => {
    let token: string;
    let user: AuthUser;
    if (USE_LIVE) {
      const res = await liveAuth.register(name, email, password, role, 'Wolf Industries');
      token = res.token;
      user = { name: res.user.name, email: res.user.email, role: asRole(res.user.role, role), company: res.user.company ?? '' };
    } else {
      // Dev-only mock registration — see the guard in signIn above.
      if (!__DEV__) throw new Error('No backend configured for this build.');
      user = { name: name || 'Wolf User', email, role, company: 'Wolf Industries' };
      token = `mock.${Date.now()}`;
    }
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, token),
      secureStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user, isNewUser: true });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.removeItem(TOKEN_KEY),
      secureStorage.removeItem(USER_KEY),
    ]);
    set({ token: null, user: null, isNewUser: false });
  },
}));

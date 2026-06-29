/**
 * Platform-safe key/value storage. Uses the OS keystore on native
 * (expo-secure-store) and falls back to localStorage on web, where SecureStore
 * is unavailable. Same async API on both.
 */
import { Platform } from 'react-native';

type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let store: Store;

if (Platform.OS === 'web') {
  store = {
    getItem: async (key) => {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    removeItem: async (key) => {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
} else {
  // Lazy require so the web bundle never pulls in the native module.
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  store = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
}

export const secureStorage = store;

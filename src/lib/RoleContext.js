'use client';

import { createContext, useContext } from 'react';

export const RoleContext = createContext('admin');

/** Ambil role user yang sedang login ('admin' | 'driver') di halaman manapun dalam (dashboard). */
export function useRole() {
  return useContext(RoleContext);
}

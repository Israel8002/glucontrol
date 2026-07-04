import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthStatus, UnlockMethod } from '@/types';
import { verifyPin, hashPin } from '@/utils/security';
import { settingsRepository } from '@/repositories/settingsRepository';
import { AuthError } from '@/core/errors';
import { logger } from '@/core/logger';

const log = logger.forModule('AuthStore');

interface AuthState {
  status: AuthStatus;
  lastActivityAt: number;
  failedAttempts: number;
  isLocked: boolean;
  
  // Acciones
  unlock: (pin?: string, method?: UnlockMethod) => Promise<void>;
  lock: () => void;
  setupPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<void>;
  disablePin: (pin: string) => Promise<void>;
  resetFailedAttempts: () => void;
  updateActivity: () => void;
  checkAutoLock: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'no_pin',
      lastActivityAt: Date.now(),
      failedAttempts: 0,
      isLocked: false,
      
      initialize: async () => {
        const settings = await settingsRepository.getOrCreate();
        if (!settings.pinEnabled) {
          set({ status: 'no_pin', isLocked: false });
        } else {
          set({ status: 'locked', isLocked: true });
        }
        log.info('AuthStore inicializado', { pinEnabled: settings.pinEnabled });
      },
      
      unlock: async (pin?: string, method: UnlockMethod = 'pin') => {
        const settings = await settingsRepository.get();
        if (!settings?.pinEnabled) {
          set({ status: 'unlocked', isLocked: false, failedAttempts: 0 });
          return;
        }
        
        if (method === 'biometric') {
          // La verificación biométrica fue exitosa en el componente
          set({ status: 'unlocked', isLocked: false, failedAttempts: 0, lastActivityAt: Date.now() });
          log.info('Desbloqueado por biometría');
          return;
        }
        
        if (!pin) throw new AuthError('Se requiere PIN');
        if (!settings.pinHash) throw new AuthError('PIN no configurado');
        
        const isValid = await verifyPin(pin, settings.pinHash);
        if (!isValid) {
          const attempts = get().failedAttempts + 1;
          set({ failedAttempts: attempts });
          log.warn(`Intento de PIN fallido #${attempts}`);
          throw new AuthError(`PIN incorrecto. Intento ${attempts} de 5.`);
        }
        
        set({ status: 'unlocked', isLocked: false, failedAttempts: 0, lastActivityAt: Date.now() });
        log.info('Desbloqueado por PIN');
      },
      
      lock: () => {
        set({ status: 'locked', isLocked: true });
        log.info('Aplicación bloqueada');
      },
      
      setupPin: async (pin: string) => {
        if (pin.length < 4 || pin.length > 6) {
          throw new AuthError('El PIN debe tener entre 4 y 6 dígitos');
        }
        if (!/^\d+$/.test(pin)) {
          throw new AuthError('El PIN solo puede contener números');
        }
        
        const pinHash = await hashPin(pin);
        await settingsRepository.update({ pinEnabled: true, pinHash });
        set({ status: 'unlocked', isLocked: false, failedAttempts: 0 });
        log.info('PIN configurado');
      },
      
      changePin: async (oldPin: string, newPin: string) => {
        const settings = await settingsRepository.get();
        if (!settings?.pinHash) throw new AuthError('PIN no configurado');
        
        const isValid = await verifyPin(oldPin, settings.pinHash);
        if (!isValid) throw new AuthError('PIN actual incorrecto');
        
        if (newPin.length < 4 || newPin.length > 6) {
          throw new AuthError('El nuevo PIN debe tener entre 4 y 6 dígitos');
        }
        
        const newPinHash = await hashPin(newPin);
        await settingsRepository.update({ pinHash: newPinHash });
        log.info('PIN cambiado');
      },
      
      disablePin: async (pin: string) => {
        const settings = await settingsRepository.get();
        if (!settings?.pinHash) throw new AuthError('PIN no configurado');
        
        const isValid = await verifyPin(pin, settings.pinHash);
        if (!isValid) throw new AuthError('PIN incorrecto');
        
        await settingsRepository.update({ pinEnabled: false, pinHash: undefined, biometricEnabled: false });
        set({ status: 'no_pin', isLocked: false });
        log.info('PIN desactivado');
      },
      
      resetFailedAttempts: () => set({ failedAttempts: 0 }),
      
      updateActivity: () => set({ lastActivityAt: Date.now() }),
      
      checkAutoLock: async () => {
        const settings = await settingsRepository.get();
        if (!settings?.pinEnabled || settings.autoLockMinutes === 0) return;
        
        const elapsed = Date.now() - get().lastActivityAt;
        const limitMs = settings.autoLockMinutes * 60 * 1000;
        
        if (elapsed > limitMs && get().status === 'unlocked') {
          get().lock();
          log.info(`Bloqueado automáticamente tras ${settings.autoLockMinutes} min de inactividad`);
        }
      },
    }),
    {
      name: 'glucontrol-auth',
      partialize: (state) => ({
        lastActivityAt: state.lastActivityAt,
        failedAttempts: state.failedAttempts,
      }),
    }
  )
);

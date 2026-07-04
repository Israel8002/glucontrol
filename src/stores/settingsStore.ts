import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/entities';
import { settingsRepository } from '@/repositories/settingsRepository';
import { DEFAULT_SETTINGS } from '@/core/constants';
import { logger } from '@/core/logger';

const log = logger.forModule('SettingsStore');

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  
  // Acciones
  loadSettings: () => Promise<void>;
  updateSettings: (changes: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  isLoading: false,
  
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsRepository.getOrCreate();
      set({ settings, isLoading: false });
      log.info('Configuración cargada');
    } catch (error) {
      log.error('Error al cargar configuración', error);
      // Fallback a configuración por defecto
      set({
        settings: { ...DEFAULT_SETTINGS, id: 'default', createdAt: '', createdTime: '',
          updatedAt: '', updatedTime: '', timezone: '', timestamp: 0, version: 1,
          isActive: true, isDeleted: false, backupCount: 0 },
        isLoading: false,
      });
    }
  },
  
  updateSettings: async (changes: Partial<AppSettings>) => {
    try {
      const updated = await settingsRepository.update(changes);
      set({ settings: updated });
      log.info('Configuración actualizada', Object.keys(changes));
    } catch (error) {
      log.error('Error al actualizar configuración', error);
      throw error;
    }
  },
}));

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIState {
  activeTab: string;
  isNavOpen: boolean;
  isInstallPromptVisible: boolean;
  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  
  setActiveTab: (tab: string) => void;
  setNavOpen: (open: boolean) => void;
  setInstallPromptVisible: (visible: boolean) => void;
  setDeferredInstallPrompt: (event: BeforeInstallPromptEvent | null) => void;
  triggerInstall: () => Promise<void>;
}

// Tipo para el evento de instalación PWA
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      activeTab: '/',
      isNavOpen: false,
      isInstallPromptVisible: false,
      deferredInstallPrompt: null,
      
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setNavOpen: (open: boolean) => set({ isNavOpen: open }),
      setInstallPromptVisible: (visible: boolean) => set({ isInstallPromptVisible: visible }),
      setDeferredInstallPrompt: (event) => set({ deferredInstallPrompt: event }),
      
      triggerInstall: async () => {
        const prompt = get().deferredInstallPrompt;
        if (!prompt) return;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          set({ deferredInstallPrompt: null, isInstallPromptVisible: false });
        }
      },
    }),
    {
      name: 'glucontrol-ui',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
);

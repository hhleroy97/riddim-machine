import { create } from "zustand";

import type { ToastMessage } from "@/types";

export type StudioWorkspace = "pattern" | "arrangement" | "sound-design" | "mixer";
export type StudioFocusedPanel = "ai" | "browser" | "inspector" | null;

interface UIStoreState {
  activeWorkspace: StudioWorkspace;
  aiPanelOpen: boolean;
  mixerPanelOpen: boolean;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  focusedPanel: StudioFocusedPanel;
  toasts: ToastMessage[];
  setActiveWorkspace: (value: StudioWorkspace) => void;
  setAIPanelOpen: (value: boolean) => void;
  setMixerPanelOpen: (value: boolean) => void;
  setSelectedTrackId: (value: string | null) => void;
  setSelectedClipId: (value: string | null) => void;
  setFocusedPanel: (value: StudioFocusedPanel) => void;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

/**
 * Owns UI-only controls and notifications.
 */
export const useUIStore = create<UIStoreState>((set) => ({
  activeWorkspace: "pattern",
  aiPanelOpen: true,
  mixerPanelOpen: true,
  selectedTrackId: null,
  selectedClipId: null,
  focusedPanel: null,
  toasts: [],
  setActiveWorkspace: (value) => set({ activeWorkspace: value }),
  setAIPanelOpen: (value) => set({ aiPanelOpen: value }),
  setMixerPanelOpen: (value) => set({ mixerPanelOpen: value }),
  setSelectedTrackId: (value) => set({ selectedTrackId: value }),
  setSelectedClipId: (value) => set({ selectedClipId: value }),
  setFocusedPanel: (value) => set({ focusedPanel: value }),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: crypto.randomUUID(),
          ...toast,
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

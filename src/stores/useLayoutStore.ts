import { create } from "zustand";

interface LayoutStore {
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebar: (isOpen: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebar: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
}));

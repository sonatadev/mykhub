import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface UiState {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  /** The editor currently on screen, so global UI can write into it. */
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  activeEditor: null,
  setActiveEditor: (editor) => set({ activeEditor: editor }),
}));

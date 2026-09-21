import { create } from 'zustand';
import { pagesApi, spacesApi } from '../api';
import type { PageSummary, Space } from '../types';
import { DEFAULT_PAGE_ICON } from '../icons';

interface WorkspaceState {
  spaces: Space[];
  spacesLoaded: boolean;
  pagesBySpace: Record<number, PageSummary[]>;
  loadingSpaces: Record<number, boolean>;

  loadSpaces: () => Promise<void>;
  loadPages: (spaceId: number) => Promise<void>;

  createSpace: (data: { name: string; icon?: string; color?: string }) => Promise<Space>;
  updateSpace: (id: number, patch: Partial<Pick<Space, 'name' | 'icon' | 'color'>>) => Promise<void>;
  deleteSpace: (id: number) => Promise<void>;
  removeSpaceLocal: (id: number) => void;
  reorderSpaces: (order: Array<{ id: number; order_index: number }>) => Promise<void>;

  createPage: (
    spaceId: number,
    parentPageId: number | null,
    title?: string,
    icon?: string
  ) => Promise<PageSummary>;
  patchPageLocal: (spaceId: number, pageId: number, patch: Partial<PageSummary>) => void;
  deletePage: (spaceId: number, pageId: number) => Promise<void>;
  movePage: (
    spaceId: number,
    order: Array<{ id: number; order_index: number; parent_page_id?: number | null }>
  ) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  spaces: [],
  spacesLoaded: false,
  pagesBySpace: {},
  loadingSpaces: {},

  loadSpaces: async () => {
    const spaces = await spacesApi.list();
    set({ spaces, spacesLoaded: true });
  },

  loadPages: async (spaceId) => {
    set((s) => ({ loadingSpaces: { ...s.loadingSpaces, [spaceId]: true } }));
    try {
      const pages = await pagesApi.list(spaceId);
      set((s) => ({
        pagesBySpace: { ...s.pagesBySpace, [spaceId]: pages },
        loadingSpaces: { ...s.loadingSpaces, [spaceId]: false },
      }));
    } catch (e) {
      set((s) => ({ loadingSpaces: { ...s.loadingSpaces, [spaceId]: false } }));
      throw e;
    }
  },

  createSpace: async (data) => {
    const space = await spacesApi.create(data);
    set((s) => ({ spaces: [...s.spaces, space] }));
    return space;
  },

  updateSpace: async (id, patch) => {
    const updated = await spacesApi.update(id, patch);
    set((s) => ({ spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, ...updated } : sp)) }));
  },

  deleteSpace: async (id) => {
    await spacesApi.remove(id);
    set((s) => {
      const { [id]: _removed, ...rest } = s.pagesBySpace;
      return { spaces: s.spaces.filter((sp) => sp.id !== id), pagesBySpace: rest };
    });
  },

  removeSpaceLocal: (id) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.pagesBySpace;
      return { spaces: s.spaces.filter((sp) => sp.id !== id), pagesBySpace: rest };
    });
  },

  reorderSpaces: async (order) => {
    const map = new Map(order.map((o) => [o.id, o.order_index]));
    set((s) => ({
      spaces: [...s.spaces]
        .map((sp) => (map.has(sp.id) ? { ...sp, order_index: map.get(sp.id)! } : sp))
        .sort((a, b) => a.order_index - b.order_index),
    }));
    await spacesApi.reorder(order);
  },

  createPage: async (spaceId, parentPageId, title, icon) => {
    const page = await pagesApi.create({
      space_id: spaceId,
      parent_page_id: parentPageId,
      title,
      icon: icon ?? DEFAULT_PAGE_ICON,
    });
    set((s) => ({
      pagesBySpace: { ...s.pagesBySpace, [spaceId]: [...(s.pagesBySpace[spaceId] || []), page] },
    }));
    return page;
  },

  patchPageLocal: (spaceId, pageId, patch) => {
    set((s) => ({
      pagesBySpace: {
        ...s.pagesBySpace,
        [spaceId]: (s.pagesBySpace[spaceId] || []).map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
      },
    }));
  },

  deletePage: async (spaceId, pageId) => {
    await pagesApi.remove(pageId);
    set((s) => ({
      pagesBySpace: {
        ...s.pagesBySpace,
        [spaceId]: (s.pagesBySpace[spaceId] || []).filter(
          (p) => p.id !== pageId && p.parent_page_id !== pageId
        ),
      },
    }));
  },

  movePage: async (spaceId, order) => {
    const patchMap = new Map(order.map((o) => [o.id, o]));
    set((s) => ({
      pagesBySpace: {
        ...s.pagesBySpace,
        [spaceId]: (s.pagesBySpace[spaceId] || []).map((p) => {
          const patch = patchMap.get(p.id);
          if (!patch) return p;
          return {
            ...p,
            order_index: patch.order_index,
            parent_page_id: patch.parent_page_id !== undefined ? patch.parent_page_id : p.parent_page_id,
          };
        }),
      },
    }));
    await pagesApi.reorder(order);
  },
}));

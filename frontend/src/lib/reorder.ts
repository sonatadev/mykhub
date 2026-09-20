import type { PageSummary } from './types';

export type DropPosition = 'before' | 'after' | 'into';

function descendantIds(pages: PageSummary[], rootId: number): Set<number> {
  const byParent = new Map<number | null, PageSummary[]>();
  for (const p of pages) {
    const key = p.parent_page_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }
  const out = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of byParent.get(id) || []) {
      out.add(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

/**
 * Computes the full set of {id, order_index, parent_page_id} updates needed
 * to move `draggedId` relative to `targetId`. Renumbers every affected
 * sibling list to contiguous 0..n-1 indices rather than juggling fractional
 * order_index values.
 */
export function computeReorder(
  pages: PageSummary[],
  draggedId: number,
  targetId: number,
  position: DropPosition
): Array<{ id: number; order_index: number; parent_page_id: number | null }> | null {
  if (draggedId === targetId) return null;
  const dragged = pages.find((p) => p.id === draggedId);
  const target = pages.find((p) => p.id === targetId);
  if (!dragged || !target) return null;

  const forbidden = descendantIds(pages, draggedId);
  const newParent = position === 'into' ? target.id : target.parent_page_id;
  if (newParent !== null && (forbidden.has(newParent) || newParent === draggedId)) return null;

  const oldParent = dragged.parent_page_id;

  const childrenOf = (parentId: number | null, excludeId: number) =>
    pages
      .filter((p) => p.parent_page_id === parentId && p.id !== excludeId)
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id);

  const updates: Array<{ id: number; order_index: number; parent_page_id: number | null }> = [];

  if (oldParent === newParent) {
    const siblings = childrenOf(newParent, draggedId);
    let insertAt = siblings.length;
    if (position !== 'into') {
      const idx = siblings.findIndex((p) => p.id === targetId);
      insertAt = position === 'before' ? idx : idx + 1;
    }
    siblings.splice(insertAt, 0, dragged);
    siblings.forEach((p, i) => updates.push({ id: p.id, order_index: i, parent_page_id: newParent }));
  } else {
    const oldSiblings = childrenOf(oldParent, draggedId);
    oldSiblings.forEach((p, i) => updates.push({ id: p.id, order_index: i, parent_page_id: oldParent }));

    const newSiblings = childrenOf(newParent, draggedId);
    let insertAt = newSiblings.length;
    if (position !== 'into') {
      const idx = newSiblings.findIndex((p) => p.id === targetId);
      insertAt = position === 'before' ? idx : idx + 1;
    }
    newSiblings.splice(insertAt, 0, dragged);
    newSiblings.forEach((p, i) => updates.push({ id: p.id, order_index: i, parent_page_id: newParent }));
  }

  return updates;
}

export function buildTree(pages: PageSummary[]) {
  const byParent = new Map<number | null, PageSummary[]>();
  for (const p of pages) {
    const key = p.parent_page_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  return byParent;
}

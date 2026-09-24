import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import SlashCommandList, { type SlashListRef } from './SlashCommandList';
import { filterSlashItems, type SlashItem } from './slashItems';

export interface SlashCommandsOptions {
  /** Opens the file picker for the "Immagine" entry. */
  onPickImage: () => void;
}

function place(host: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const { offsetHeight: h, offsetWidth: w } = host;

  // On a phone the on-screen keyboard shrinks the visual viewport without
  // changing window.innerHeight, so the menu has to be kept inside the part
  // that is actually visible.
  const view = window.visualViewport;
  const viewTop = view?.offsetTop ?? 0;
  const viewBottom = viewTop + (view?.height ?? window.innerHeight);
  const viewLeft = view?.offsetLeft ?? 0;
  const viewRight = viewLeft + (view?.width ?? window.innerWidth);

  const fitsBelow = rect.bottom + 8 + h <= viewBottom;
  const fitsAbove = rect.top - 8 - h >= viewTop;
  const top = fitsBelow || !fitsAbove ? rect.bottom + 8 : rect.top - h - 8;

  host.style.top = `${Math.max(viewTop + 8, Math.min(top, viewBottom - h - 8))}px`;
  host.style.left = `${Math.max(viewLeft + 8, Math.min(rect.left, viewRight - w - 8))}px`;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return { onPickImage: () => {} };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => props.run(editor as Editor, range as Range, {
          pickImage: options.onPickImage,
        }),
        items: ({ query }) => filterSlashItems(query),
        render: () => {
          let component: ReactRenderer<SlashListRef> | null = null;
          let host: HTMLElement | null = null;
          let caret: DOMRect | null = null;
          let observer: ResizeObserver | null = null;

          // The menu is measured to decide whether it goes above or below the
          // caret, so it can only be placed once it has been painted: React
          // renders asynchronously, and filtering the list changes its height.
          // A ResizeObserver covers both cases.
          const reposition = () => {
            if (host && caret) place(host, caret);
          };

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props: { items: props.items, command: (item: SlashItem) => props.command(item) },
                editor: props.editor,
              });
              host = document.createElement('div');
              host.className = 'slash-menu';
              host.appendChild(component.element);
              document.body.appendChild(host);
              caret = props.clientRect?.() ?? null;
              observer = new ResizeObserver(reposition);
              observer.observe(host);
              window.visualViewport?.addEventListener('resize', reposition);
              requestAnimationFrame(reposition);
            },
            onUpdate: (props) => {
              component?.updateProps({
                items: props.items,
                command: (item: SlashItem) => props.command(item),
              });
              caret = props.clientRect?.() ?? caret;
              requestAnimationFrame(reposition);
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                observer?.disconnect();
                observer = null;
                host?.remove();
                host = null;
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              observer?.disconnect();
              observer = null;
              window.visualViewport?.removeEventListener('resize', reposition);
              host?.remove();
              host = null;
              caret = null;
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});

export default SlashCommands;

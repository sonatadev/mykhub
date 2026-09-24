import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListChecks,
  ImageIcon,
  FunctionSquare,
  Sigma,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import TableGridPopover from './TableGridPopover';
import LinkPopover from './LinkPopover';
import TheoremMenu from './TheoremMenu';

export default function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  return (
    <div className="editor-toolbar flex items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5 md:flex-wrap md:overflow-x-visible print:hidden">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Grassetto"
      >
        <Bold />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Corsivo"
      >
        <Italic />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Sottolineato"
      >
        <UnderlineIcon />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-label="Titolo 1"
      >
        <Heading1 />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Titolo 2"
      >
        <Heading2 />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Elenco puntato"
      >
        <List />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Elenco numerato"
      >
        <ListOrdered />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('taskList')}
        onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
        aria-label="Checklist"
      >
        <ListChecks />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <LinkPopover editor={editor} />
      <TableGridPopover editor={editor} />
      <Toggle size="sm" onPressedChange={onPickImage} aria-label="Inserisci immagine">
        <ImageIcon />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Toggle
        size="sm"
        onPressedChange={() => editor.chain().focus().insertInlineMath().run()}
        aria-label="Formula inline (Ctrl+M)"
        title="Formula inline — Ctrl+M"
      >
        <FunctionSquare />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('mathBlock')}
        onPressedChange={() => editor.chain().focus().setMathBlock().run()}
        aria-label="Formula in display (Ctrl+Shift+M)"
        title="Formula in display — Ctrl+Shift+M"
      >
        <Sigma />
      </Toggle>
      <TheoremMenu editor={editor} />
    </div>
  );
}

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';

export default function ReadOnlyContent({ content }: { content: Record<string, unknown> }) {
  const editor = useEditor({
    editable: false,
    content,
    extensions: [
      StarterKit,
      Typography,
      Link.configure({ openOnClick: true }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Image,
    ],
    editorProps: { attributes: { class: 'editor-content' } },
  });

  return <EditorContent editor={editor} />;
}

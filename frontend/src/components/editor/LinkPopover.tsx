import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (open) setUrl(editor.getAttributes('link').href || '');
  }, [open, editor]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('mykhub:open-link-popover', handler);
    return () => window.removeEventListener('mykhub:open-link-popover', handler);
  }, []);

  function apply() {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive('link')} aria-label="Link">
          <Link2 />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://esempio.it"
            className="h-8"
          />
          <Button type="submit" size="sm">
            OK
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

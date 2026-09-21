import { FileText, Folder } from 'lucide-react';
import { resolveIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

export default function IconGlyph({
  value,
  kind = 'space',
  className,
}: {
  value: string | undefined;
  kind?: 'space' | 'page';
  className?: string;
}) {
  const Icon = resolveIcon(value, kind === 'page' ? FileText : Folder);
  return <Icon className={cn('h-4 w-4 shrink-0', className)} />;
}

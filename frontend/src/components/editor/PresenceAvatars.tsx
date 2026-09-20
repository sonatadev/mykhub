import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { initials } from '@/lib/utils';
import type { CollabUser } from './useCollabEditor';

export default function PresenceAvatars({ users }: { users: CollabUser[] }) {
  if (users.length === 0) return null;
  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u) => (
        <Tooltip key={u.clientId}>
          <TooltipTrigger asChild>
            <Avatar className="h-6 w-6 ring-2 ring-background">
              <AvatarFallback style={{ backgroundColor: u.color }} className="text-[10px]">
                {initials(u.email)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{u.email}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Avatar className="h-6 w-6 ring-2 ring-background">
          <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">+{overflow}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

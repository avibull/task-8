import { useState } from "react";
import { Send } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useProfileByUsername } from "@/lib/profilesCache";
import { useMention } from "@/contexts/MentionContext";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface Props {
  username: string;
  task?: Task | null;
  className?: string;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const m = phone.match(/^\s*\+?(\d{1,3})[\s-]*(\d{2})/);
  if (m) return `+${m[1]} ${m[2]} XX`;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 4) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} XX`;
  return digits;
}

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366" aria-hidden="true">
    <path d="M19.05 4.91A10 10 0 0 0 2.1 17.34L1 23l5.79-1.07A10 10 0 1 0 19.05 4.91Zm-7.06 15.4a8.34 8.34 0 0 1-4.25-1.16l-.3-.18-3.43.63.65-3.34-.2-.32a8.36 8.36 0 1 1 7.53 4.37Zm4.59-6.25c-.25-.13-1.49-.74-1.72-.82s-.4-.13-.57.13-.65.82-.8 1-.3.18-.55.06a6.85 6.85 0 0 1-2-1.25 7.58 7.58 0 0 1-1.4-1.74c-.15-.25 0-.39.11-.51s.25-.3.38-.45a1.75 1.75 0 0 0 .25-.42.46.46 0 0 0 0-.44c-.06-.13-.57-1.38-.78-1.88s-.42-.43-.57-.43h-.49a.94.94 0 0 0-.68.32 2.85 2.85 0 0 0-.9 2.12 5 5 0 0 0 1 2.6 11.36 11.36 0 0 0 4.34 3.84c.6.26 1.07.41 1.44.53a3.48 3.48 0 0 0 1.59.1 2.62 2.62 0 0 0 1.71-1.21 2.12 2.12 0 0 0 .15-1.21c-.06-.11-.23-.18-.48-.31Z" />
  </svg>
);

/**
 * Tappable @-mention. Opens a popover with WhatsApp + (optional) ping action.
 * Pass `task` only to enable the "Ping about this task" action — the WhatsApp
 * link never prefills a message.
 */
export function UserMention({ username, task, className }: Props) {
  const profile = useProfileByUsername(username);
  const { onPingTask } = useMention();
  const [open, setOpen] = useState(false);

  const phone = profile?.phone ?? "";
  const digits = phone.replace(/\D/g, "");
  const waHref = digits ? `https://wa.me/${digits}` : null;


  const canPing = !!task && !!onPingTask;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "mono text-accent-lime underline decoration-dotted underline-offset-2 hover:text-accent-lime/80",
            className
          )}
        >
          @{username}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={8}
        className="w-[220px] rounded-[4px] border border-border bg-panel p-0 text-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2">
          <div className="mono text-sm font-bold text-accent-lime">@{username}</div>
          <div className="mono mt-0.5 text-[11px] text-dim">{profile?.name ?? "—"}</div>
        </div>

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-panel-2"
          >
            <span className="flex items-center gap-2">
              <WhatsAppIcon />
              <span className="mono text-[11px] uppercase tracking-wider">Open WhatsApp</span>
            </span>
            <span className="mono text-[10px] text-dim">{maskPhone(phone)}</span>
          </a>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 opacity-40">
            <WhatsAppIcon />
            <span className="mono text-[11px] uppercase tracking-wider">No phone</span>
          </div>
        )}

        {canPing && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPingTask!(task!, username);
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left hover:bg-panel-2"
          >
            <Send size={14} className="text-accent-lime" />
            <span className="mono text-[11px] uppercase tracking-wider text-accent-lime">
              Ping about this task
            </span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

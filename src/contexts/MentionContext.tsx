import { createContext, useContext, type ReactNode } from "react";
import type { Task } from "@/lib/types";

interface MentionCtx {
  onPingTask?: (task: Task, username: string) => void;
}

const Ctx = createContext<MentionCtx>({});

export function MentionProvider({
  onPingTask,
  children,
}: {
  onPingTask?: (task: Task, username: string) => void;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ onPingTask }}>{children}</Ctx.Provider>;
}

export const useMention = () => useContext(Ctx);

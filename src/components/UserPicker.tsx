import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/lib/types";
import { PickerSheet } from "./PickerSheet";

interface Props {
  /** Currently selected @usernames (without the leading @). */
  selected: string[];
  /** Called when a username is toggled on/off. */
  onToggle: (username: string) => void;
  onClose: () => void;
  /** Hide self from the list (default true). */
  excludeSelf?: boolean;
  title?: string;
}

/** Reusable user picker — used in AddBar, drawer ASSIGN, and alert recipients. */
export function UserPicker({ selected, onToggle, onClose, excludeSelf = true, title = "ASSIGN USERS" }: Props) {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setProfiles((data as Profile[]) ?? []));
  }, []);

  const items = profiles
    .filter((p) => !excludeSelf || p.username !== profile?.username)
    .map((p) => ({ key: p.username, label: p.name, sub: `@${p.username}` }));

  return (
    <PickerSheet
      title={title}
      placeholder="Search users..."
      items={items}
      selectedKeys={selected}
      onToggle={onToggle}
      onClose={onClose}
    />
  );
}

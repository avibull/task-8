export type Priority = "P1" | "P2" | "P3" | "Daily" | "None";
export type AlertType = "normal" | "urgent";
export type AlertTrigger = "now" | "scheduled";
export type AlertStatus = "pending" | "acknowledged" | "scheduled";

export interface Profile {
  id: string;
  employee_id: string;
  name: string;
  username: string;
  phone: string;
  is_admin: boolean;
  can_edit_tags: boolean;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
}

export const canManageTags = (p?: Pick<Profile, "is_admin" | "can_edit_tags"> | null) =>
  !!p && (p.is_admin || p.can_edit_tags);
export const canManageUsers = (p?: Pick<Profile, "is_admin"> | null) => !!p && p.is_admin;

export interface Task {
  id: string;
  text: string;
  priority: Priority;
  tags: string[];
  assigned_to: string[];
  created_by: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  is_default: boolean;
}

export interface Alert {
  id: string;
  task_id: string | null;
  type: AlertType;
  trigger: AlertTrigger;
  scheduled_at: string | null;
  sender: string;
  recipient: string;
  status: AlertStatus;
  sent_at: string | null;
  ack_at: string | null;
  created_at: string;
}

/** Synthetic email used to wrap employee_id into Supabase auth. */
export const empEmail = (eid: string) => `${eid.toLowerCase()}@turbotask.local`;
/** Pad PIN to satisfy Supabase min-password length while keeping PIN as the secret. */
export const pinToPassword = (pin: string) => `tt_pin_${pin}`;

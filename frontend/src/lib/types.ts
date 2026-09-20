export type Theme = 'light' | 'dark' | 'system';
export type ContentFont = 'inter' | 'georgia' | 'jetbrains';

export interface UserSettings {
  theme?: Theme;
  accent?: string;
  font?: ContentFont;
  bgColor?: string | null;
}

export interface User {
  id: number;
  email: string;
  settings: UserSettings;
  created_at: string;
}

export interface Space {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  color: string;
  order_index: number;
  share_token: string | null;
  created_at: string;
  role: 'owner' | 'member';
}

export interface PageSummary {
  id: number;
  space_id: number;
  parent_page_id: number | null;
  title: string;
  icon: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface PageFull extends PageSummary {
  user_id: number;
  content: Record<string, unknown>;
  share_token: string | null;
  ydoc_state?: string;
}

export interface SpaceMember {
  id: number;
  email: string;
  created_at: string;
}

export interface PublicPage {
  id: number;
  title: string;
  content: Record<string, unknown>;
  icon: string;
  space_id: number;
  parent_page_id: number | null;
  updated_at: string;
  space_name: string;
  space_color: string;
  space_icon: string;
  breadcrumb: string[];
}

export interface PublicSpaceData {
  space: { id: number; name: string; icon: string; color: string };
  pages: Array<{
    id: number;
    parent_page_id: number | null;
    title: string;
    icon: string;
    order_index: number;
    content: Record<string, unknown>;
  }>;
}

export interface BackupPayload {
  version: number;
  exported_at: string;
  spaces: Array<{ id: number; name: string; icon: string; color: string; order_index: number }>;
  pages: Array<{
    id: number;
    space_id: number;
    parent_page_id: number | null;
    title: string;
    content: unknown;
    icon: string;
    order_index: number;
  }>;
}

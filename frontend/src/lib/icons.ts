import {
  Folder,
  FileText,
  BookOpen,
  Lightbulb,
  CheckSquare,
  Target,
  Bookmark,
  BarChart2,
  Brain,
  Microscope,
  Wrench,
  Palette,
  Sprout,
  MessageSquare,
  TrendingUp,
  Home,
  Briefcase,
  GraduationCap,
  Puzzle,
  Globe,
  Clover,
  Flame,
  FlaskConical,
  Camera,
  CalendarDays,
  Star,
  Archive,
  Rocket,
  Code,
  Music,
  Heart,
  type LucideIcon,
} from 'lucide-react';

export const DEFAULT_SPACE_ICON = 'folder';
export const DEFAULT_PAGE_ICON = 'file-text';

export const ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  'file-text': FileText,
  'book-open': BookOpen,
  lightbulb: Lightbulb,
  'check-square': CheckSquare,
  target: Target,
  bookmark: Bookmark,
  'bar-chart': BarChart2,
  brain: Brain,
  microscope: Microscope,
  wrench: Wrench,
  palette: Palette,
  sprout: Sprout,
  'message-square': MessageSquare,
  'trending-up': TrendingUp,
  home: Home,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  puzzle: Puzzle,
  globe: Globe,
  clover: Clover,
  flame: Flame,
  flask: FlaskConical,
  camera: Camera,
  calendar: CalendarDays,
  star: Star,
  archive: Archive,
  rocket: Rocket,
  code: Code,
  music: Music,
  heart: Heart,
};

export const ICON_KEYS = Object.keys(ICONS);

/** Space/page icons are stored as short name keys (e.g. "folder"), never
 * emoji. Anything already in the database from before this convention
 * (or anything unrecognized) falls back to a neutral glyph instead of
 * ever rendering a raw emoji character. */
export function resolveIcon(value: string | undefined, fallback: LucideIcon = Folder): LucideIcon {
  if (value && ICONS[value]) return ICONS[value];
  return fallback;
}

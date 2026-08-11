import {
  ThumbsDown,
  Meh,
  Sparkles,
  Star,
  Bookmark,
  FolderHeart,
} from "lucide-react-native";

export type ReactionType =
  | "lame"
  | "okay"
  | "pure gold"
  | "Absolute cinema"
  | "watchlist"
  | "collection";

export const ReactionConfig: Record<
  ReactionType,
  { icon: React.ElementType; color: string; label: string }
> = {
  lame: { icon: ThumbsDown, color: "#ff4444", label: "Lame" },
  okay: { icon: Meh, color: "#aaaaaa", label: "Okay" },
  "pure gold": { icon: Sparkles, color: "#ffbb33", label: "Pure Gold" },
  "Absolute cinema": { icon: Star, color: "#00C851", label: "Absolute Cinema" },
  watchlist: { icon: Bookmark, color: "#33b5e5", label: "Watchlist" },
  collection: { icon: FolderHeart, color: "#ff8800", label: "Collection" },
};

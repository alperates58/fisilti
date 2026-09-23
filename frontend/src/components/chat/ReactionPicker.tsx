"use client";

import { useChatStore } from "@/store/useChatStore";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface ReactionPickerProps {
  messageId: string;
  onSelect?: () => void;
  className?: string;
}

export function ReactionPicker({ messageId, onSelect, className = "" }: ReactionPickerProps) {
  const toggleReaction = useChatStore((state) => state.toggleReaction);

  const handleEmojiClick = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleReaction(messageId, emoji);
    if (onSelect) onSelect();
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-slate-900/95 border border-slate-700/80 rounded-full shadow-xl backdrop-blur-md z-30 select-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => handleEmojiClick(emoji, e)}
          className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface ReactionBadgesProps {
  reactions?: Record<string, string[]>;
  messageId: string;
  isMine: boolean;
}

export function ReactionBadges({ reactions, messageId, isMine }: ReactionBadgesProps) {
  const toggleReaction = useChatStore((state) => state.toggleReaction);

  if (!reactions || Object.keys(reactions).length === 0) return null;

  const entries = Object.entries(reactions).filter(([_, users]) => users && users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 mt-1 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(messageId, emoji)}
          title={`${users.length} kişi`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-[11px] text-slate-200 hover:border-pink-500/50 hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
        >
          <span>{emoji}</span>
          {users.length > 1 && <span className="font-semibold text-[10px]">{users.length}</span>}
        </button>
      ))}
    </div>
  );
}

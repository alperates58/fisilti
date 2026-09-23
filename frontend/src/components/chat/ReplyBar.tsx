"use client";

import { useChatStore } from "@/store/useChatStore";
import { CornerUpLeft, X, Mic, Image, FileText } from "lucide-react";

export default function ReplyBar() {
  const { replyingTo, setReplyingTo } = useChatStore();

  if (!replyingTo) return null;

  const renderContentPreview = () => {
    if (replyingTo.message_type === "voice") {
      return (
        <span className="flex items-center gap-1.5 text-pink-400">
          <Mic className="w-3.5 h-3.5" />
          <span>Sesli Mesaj</span>
        </span>
      );
    }
    if (replyingTo.message_type === "image") {
      return (
        <span className="flex items-center gap-1.5 text-pink-400">
          <Image className="w-3.5 h-3.5" />
          <span>Fotoğraf</span>
        </span>
      );
    }
    if (replyingTo.message_type === "file") {
      return (
        <span className="flex items-center gap-1.5 text-pink-400">
          <FileText className="w-3.5 h-3.5" />
          <span>Belge / Dosya</span>
        </span>
      );
    }
    return <span className="truncate">{replyingTo.content}</span>;
  };

  return (
    <div className="mx-4 mb-2 p-2.5 rounded-xl bg-slate-900/90 border-l-4 border-l-grupo-accent border border-grupo-dark-border flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <CornerUpLeft className="w-4 h-4 text-grupo-accent flex-shrink-0" />
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-semibold text-grupo-accent truncate">
            {replyingTo.is_mine ? "Kendine Cevap Veriyorsun" : "Mesaja Cevap Veriyorsun"}
          </div>
          <div className="text-slate-300 truncate mt-0.5">{renderContentPreview()}</div>
        </div>
      </div>
      <button
        onClick={() => setReplyingTo(null)}
        title="Cevaplamayı İptal Et"
        className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer ml-2 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

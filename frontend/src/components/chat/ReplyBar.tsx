"use client";

import { useChatStore } from "@/store/useChatStore";
import { CornerUpLeft, X, Mic, Image, Video, FileText } from "lucide-react";

export default function ReplyBar() {
  const { replyingTo, setReplyingTo, conversations, activeConversationId } = useChatStore();

  if (!replyingTo) return null;

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherUserName = activeConv?.other_user.display_name || "Karşı Taraf";

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
    if (replyingTo.message_type === "video") {
      return (
        <span className="flex items-center gap-1.5 text-pink-400">
          <Video className="w-3.5 h-3.5" />
          <span>Video</span>
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
    <div className="mx-3 sm:mx-6 mb-2 p-2.5 rounded-2xl bg-slate-900/95 border-l-4 border-l-pink-500 border border-slate-700/80 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <CornerUpLeft className="w-4 h-4 text-pink-400 flex-shrink-0" />
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-bold text-pink-400 truncate">
            {replyingTo.is_mine ? "Kendine Yanıt Veriyorsun" : `${otherUserName}'a Yanıt Veriyorsun`}
          </div>
          <div className="text-slate-300 truncate mt-0.5">{renderContentPreview()}</div>
        </div>
      </div>
      <button
        onClick={() => setReplyingTo(null)}
        title="Yanıtlamayı İptal Et"
        className="w-7 h-7 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer ml-2 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

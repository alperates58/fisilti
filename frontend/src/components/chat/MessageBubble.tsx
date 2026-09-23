"use client";

import { Message, useChatStore } from "@/store/useChatStore";
import { Check, CheckCheck, Info } from "lucide-react";
import { format } from "date-fns";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const setSelectedMessageInfo = useChatStore((state) => state.setSelectedMessageInfo);

  const formattedTime = (() => {
    try {
      return format(new Date(message.sent_at || message.created_at), "HH:mm");
    } catch {
      return "";
    }
  })();

  const renderTicks = () => {
    if (!message.is_mine) return null;

    if (message.tick_status === "read") {
      // Çift Mavi Tik
      return <CheckCheck className="w-4 h-4 text-sky-400 inline ml-1" />;
    } else if (message.tick_status === "delivered") {
      // Çift Gri Tik
      return <CheckCheck className="w-4 h-4 text-slate-400 inline ml-1" />;
    }
    // Tek Gri Tik
    return <Check className="w-4 h-4 text-slate-400 inline ml-1" />;
  };

  return (
    <div
      className={`group flex items-end mb-2.5 ${
        message.is_mine ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[70%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
          message.is_mine
            ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-xs"
            : "bg-grupo-dark-card border border-grupo-dark-border text-slate-100 rounded-bl-xs"
        }`}
      >
        {/* Mesaj İçeriği */}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>

        {/* Zaman ve WhatsApp Tikleri */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[11px] opacity-80 float-right ml-3 select-none">
          <span>{formattedTime}</span>
          {renderTicks()}
        </div>

        {/* Mesaj Bilgisi Hızlı Butonu (Hover olunca açılır) */}
        {message.is_mine && (
          <button
            onClick={() => setSelectedMessageInfo(message)}
            title="Mesaj Bilgisi"
            className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useStoryStore } from "@/store/useStoryStore";
import { resolveMediaUrl } from "@/lib/api";
import { X, Sparkles } from "lucide-react";

export default function StoryNotificationBanner() {
  const { inAppNotification, dismissStoryNotification, storyGroups, openViewer, loadStories } = useStoryStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (inAppNotification) {
      setIsVisible(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
      const timer = setTimeout(() => {
        handleDismiss();
      }, 6500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [inAppNotification]);

  if (!inAppNotification || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissStoryNotification();
    }, 200);
  };

  const handleClick = async () => {
    const targetUserId = inAppNotification.userId;
    handleDismiss();

    let targetGroup = storyGroups.find((g) => g.user.id === targetUserId);
    if (!targetGroup) {
      await loadStories();
      const updatedGroups = useStoryStore.getState().storyGroups;
      targetGroup = updatedGroups.find((g) => g.user.id === targetUserId);
    }

    if (targetGroup) {
      openViewer(targetGroup, 0);
    }
  };

  const isCloseFriends = inAppNotification.audience === "close_friends";

  return (
    <div
      onClick={handleClick}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm sm:max-w-md p-3 rounded-2xl bg-slate-900/98 border border-slate-700/90 shadow-2xl backdrop-blur-md flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-top-4 duration-300 select-none"
      style={{
        boxShadow: isCloseFriends
          ? "0 20px 40px -10px rgba(16, 185, 129, 0.4)"
          : "0 20px 40px -10px rgba(236, 72, 153, 0.4)",
      }}
    >
      {/* Avatar with Animated Story Ring */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-11 h-11 rounded-full p-0.5 flex items-center justify-center animate-pulse ${
            isCloseFriends
              ? "bg-gradient-to-tr from-emerald-500 via-green-400 to-teal-400 ring-2 ring-emerald-500/40"
              : "bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 ring-2 ring-pink-500/30"
          }`}
        >
          <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-xs font-bold text-white border-2 border-slate-900">
            {inAppNotification.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(inAppNotification.authorAvatar)}
                alt={inAppNotification.authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              inAppNotification.authorName.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* Title & Caption */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate">
            {inAppNotification.authorName}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border flex items-center gap-0.5 ${
              isCloseFriends
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-pink-500/20 text-pink-400 border-pink-500/30"
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Yeni Hikaye</span>
          </span>
        </div>
        <p className="text-[11px] text-slate-300 truncate mt-0.5">
          {inAppNotification.caption ? `"${inAppNotification.caption}"` : "Hikayeyi görmek için dokunun"}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        title="Kapat"
        className="w-7 h-7 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

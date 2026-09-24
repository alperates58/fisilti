"use client";

import React, { useEffect } from "react";
import { useStoryStore, UserStoriesGroup } from "@/store/useStoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Plus } from "lucide-react";

export default function StoriesBar() {
  const { user } = useAuthStore();
  const { storyGroups, loadStories, openViewer, openCreator } = useStoryStore();

  useEffect(() => {
    loadStories();
    // Her 2 dakikada bir hikayeleri arka planda tazele
    const interval = setInterval(() => {
      loadStories();
    }, 120000);
    return () => clearInterval(interval);
  }, [loadStories]);

  // Kendi hikaye grubumuz var mı?
  const ownGroup = storyGroups.find((g) => g.user.id === user?.id);
  const otherGroups = storyGroups.filter((g) => g.user.id !== user?.id);

  return (
    <div className="border-b border-grupo-dark-border bg-grupo-dark-card/50 px-3.5 py-2.5">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
        {/* 1. KENDİ HİKAYEN (Ekle / Gör) */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <button
              onClick={() => {
                if (ownGroup && ownGroup.stories.length > 0) {
                  openViewer(ownGroup);
                } else {
                  openCreator();
                }
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center p-0.5 transition-transform group-hover:scale-105 ${
                ownGroup && ownGroup.stories.length > 0
                  ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400"
                  : "bg-slate-800 border-2 border-dashed border-slate-600 hover:border-pink-500"
              }`}
            >
              <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-xs text-pink-400 border-2 border-grupo-dark-card">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.display_name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
            </button>

            {/* '+' Ekleme Rozeti */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openCreator();
              }}
              title="Yeni Hikaye Paylaş"
              className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-pink-500 hover:bg-pink-400 text-white flex items-center justify-center shadow-md border-2 border-grupo-dark-card transition-transform hover:scale-110 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-300 max-w-[62px] truncate">
            {ownGroup && ownGroup.stories.length > 0 ? "Hikayen" : "Hikaye Ekle"}
          </span>
        </div>

        {/* 2. DİĞER KULLANICILARIN HİKAYELERİ */}
        {otherGroups.map((group) => {
          const hasUnviewed = group.has_unviewed;
          return (
            <button
              key={group.user.id}
              onClick={() => openViewer(group)}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center p-0.5 transition-transform group-hover:scale-105 ${
                  hasUnviewed
                    ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 animate-in fade-in"
                    : "border-2 border-slate-700"
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-xs text-pink-400 border-2 border-grupo-dark-card">
                  {group.user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.user.avatar_url}
                      alt={group.user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    group.user.display_name?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
              </div>

              <span
                className={`text-[11px] max-w-[62px] truncate transition-colors ${
                  hasUnviewed ? "font-semibold text-white" : "font-normal text-slate-400"
                }`}
              >
                {group.user.display_name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

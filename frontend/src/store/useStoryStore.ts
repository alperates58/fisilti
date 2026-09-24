import { create } from "zustand";
import { api } from "@/lib/api";

export interface Story {
  id: string;
  user_id: string;
  media_type: "image" | "video" | "text" | "audio";
  media_url: string;
  caption: string;
  background_color: string;
  music_title: string;
  music_artist: string;
  music_url: string;
  duration_seconds?: number;
  music_start?: number;
  music_end?: number;
  stickers: any[];
  views: string[];
  views_count: number;
  has_viewed: boolean;
  expires_at: string;
  created_at: string;
}

export interface StoryAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface UserStoriesGroup {
  user: StoryAuthor;
  stories: Story[];
  has_unviewed: boolean;
  latest_story: string;
}

interface StoryStoreState {
  storyGroups: UserStoriesGroup[];
  isLoading: boolean;
  activeViewerGroup: UserStoriesGroup | null;
  activeViewerStoryIndex: number;
  isCreatorOpen: boolean;

  loadStories: () => Promise<void>;
  createStory: (storyData: {
    media_type: "image" | "video" | "text" | "audio";
    media_url: string;
    caption?: string;
    background_color?: string;
    music_title?: string;
    music_artist?: string;
    music_url?: string;
    duration_seconds?: number;
    music_start?: number;
    music_end?: number;
    stickers?: any[];
  }) => Promise<void>;
  markStoryViewed: (storyId: string) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  getStoryViewers: (storyId: string) => Promise<StoryAuthor[]>;

  openViewer: (group: UserStoriesGroup, initialIndex?: number) => void;
  closeViewer: () => void;
  setViewerStoryIndex: (index: number) => void;
  editingStory: Story | null;
  openCreator: (storyToEdit?: Story) => void;
  closeCreator: () => void;
  updateStory: (
    storyId: string,
    storyData: {
      caption?: string;
      background_color?: string;
      music_title?: string;
      music_artist?: string;
      music_url?: string;
      duration_seconds?: number;
      music_start?: number;
      music_end?: number;
      stickers?: any[];
    }
  ) => Promise<void>;
}

export const useStoryStore = create<StoryStoreState>((set, get) => ({
  storyGroups: [],
  isLoading: false,
  activeViewerGroup: null,
  activeViewerStoryIndex: 0,
  isCreatorOpen: false,

  loadStories: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<{ story_groups: UserStoriesGroup[] }>("/stories");
      set({ storyGroups: res.data.story_groups || [] });
    } catch (err) {
      console.error("Hikayeler yüklenemedi:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  createStory: async (storyData) => {
    try {
      await api.post("/stories", storyData);
      await get().loadStories();
    } catch (err) {
      console.error("Hikaye oluşturulamadı:", err);
      throw err;
    }
  },

  markStoryViewed: async (storyId: string) => {
    try {
      await api.post(`/stories/${storyId}/view`);
      // Lokal durumu anında güncelle
      set((state) => {
        const updated = state.storyGroups.map((g) => ({
          ...g,
          stories: g.stories.map((s) =>
            s.id === storyId ? { ...s, has_viewed: true, views_count: s.views_count + 1 } : s
          ),
          has_unviewed: g.stories.some((s) => s.id !== storyId && !s.has_viewed),
        }));
        return { storyGroups: updated };
      });
    } catch (err) {
      console.error("Görüldü işaretlenemedi:", err);
    }
  },

  deleteStory: async (storyId: string) => {
    try {
      await api.delete(`/stories/${storyId}`);
      await get().loadStories();
      const currentGroup = get().activeViewerGroup;
      if (currentGroup) {
        const remaining = currentGroup.stories.filter((s) => s.id !== storyId);
        if (remaining.length === 0) {
          get().closeViewer();
        } else {
          set({
            activeViewerGroup: { ...currentGroup, stories: remaining },
            activeViewerStoryIndex: 0,
          });
        }
      }
    } catch (err) {
      console.error("Hikaye silinemedi:", err);
    }
  },

  getStoryViewers: async (storyId: string) => {
    try {
      const res = await api.get<{ viewers: StoryAuthor[] }>(`/stories/${storyId}/viewers`);
      return res.data.viewers || [];
    } catch (err) {
      console.error("Görüntüleyenler alınamadı:", err);
      return [];
    }
  },

  openViewer: (group, initialIndex = 0) => {
    set({
      activeViewerGroup: group,
      activeViewerStoryIndex: initialIndex,
    });
  },

  closeViewer: () => {
    set({
      activeViewerGroup: null,
      activeViewerStoryIndex: 0,
    });
  },

  setViewerStoryIndex: (index) => {
    set({ activeViewerStoryIndex: index });
  },

  editingStory: null,

  openCreator: (storyToEdit?: Story) => {
    set({ isCreatorOpen: true, editingStory: storyToEdit || null });
  },

  closeCreator: () => {
    set({ isCreatorOpen: false, editingStory: null });
  },

  updateStory: async (storyId, storyData) => {
    try {
      await api.patch(`/stories/${storyId}`, storyData);
      await get().loadStories();
    } catch (err) {
      console.error("Hikaye güncellenemedi:", err);
      throw err;
    }
  },
}));

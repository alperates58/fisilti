"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

interface Props {
  audioUrl: string;
  isMine: boolean;
}

export default function AudioWaveform({ audioUrl, isMine }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState("0:00");
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const finalUrl = resolveMediaUrl(audioUrl);
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isMine ? "rgba(255, 255, 255, 0.4)" : "rgba(148, 163, 184, 0.4)",
      progressColor: isMine ? "#FFFFFF" : "#E91E63",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 32,
      url: finalUrl,
    });

    ws.on("ready", () => {
      const dur = ws.getDuration();
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      setDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
    });

    ws.on("audioprocess", () => {
      const cur = ws.getCurrentTime();
      const mins = Math.floor(cur / 60);
      const secs = Math.floor(cur % 60);
      setCurrentTime(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      setIsPlaying(false);
      ws.seekTo(0);
    });

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, isMine]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const cycleSpeed = () => {
    if (!waveSurferRef.current) return;
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    waveSurferRef.current.setPlaybackRate(nextRate);
    setPlaybackRate(nextRate);
  };

  return (
    <div className="flex items-center gap-3 w-full min-w-[200px] max-w-[280px] py-1 select-none">
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 cursor-pointer shadow-md ${
          isMine ? "bg-white text-pink-600" : "bg-grupo-accent text-white"
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div ref={containerRef} className="cursor-pointer" />
        <div className="flex justify-between text-[10px] opacity-80 mt-0.5">
          <span>{isPlaying ? currentTime : duration}</span>
          <button
            onClick={cycleSpeed}
            className="px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 font-bold transition-colors cursor-pointer"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Send,
  RotateCcw,
  Trash2,
  Paintbrush,
  Eraser,
  Sparkles,
} from "lucide-react";
import { useSocketStore } from "@/store/useSocketStore";

interface DoodleModalProps {
  isOpen: boolean;
  conversationId: string | null;
  onClose: () => void;
  onSendDoodle: (file: File) => void;
}

const COLORS = [
  "#FFFFFF",
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#000000",
];

const BRUSH_SIZES = [2, 5, 10, 18];

export default function DoodleModal({
  isOpen,
  conversationId,
  onClose,
  onSendDoodle,
}: DoodleModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState("#EC4899");
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const { socket, sendAction } = useSocketStore();

  // Canvas boyutunu ayarla
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Yüksek DPI için çözünürlüğü ikiye katla
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Koyu zemin boya
    ctx.fillStyle = "#0B0E14";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // İlk durumu geçmişe kaydet
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialData]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(initCanvas, 50);
    } else {
      setHistory([]);
    }
  }, [isOpen, initCanvas]);

  // Karşı taraftan gelen canlı çizim vuruşlarını dinle
  useEffect(() => {
    if (!socket || !isOpen || !conversationId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.action === "doodle_stroke" &&
          data.payload?.conversation_id === conversationId
        ) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const { x0, y0, x1, y1, color, size } = data.payload;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.strokeStyle = color;
          ctx.lineWidth = size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      } catch {}
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, isOpen, conversationId]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pos = getCanvasCoords(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPos = getCanvasCoords(e);
    const color = isEraser ? "#0B0E14" : selectedColor;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Gerçek zamanlı soket yayını
    if (conversationId) {
      sendAction("doodle_stroke", {
        conversation_id: conversationId,
        x0: lastPos.current.x,
        y0: lastPos.current.y,
        x1: currentPos.x,
        y1: currentPos.y,
        color,
        size: brushSize,
      });
    }

    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Vuruşu geçmişe ekle
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), currentData]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextHistory = history.slice(0, history.length - 1);
    const prevData = nextHistory[nextHistory.length - 1];
    ctx.putImageData(prevData, 0, 0);
    setHistory(nextHistory);
  };

  const handleClear = () => {
    initCanvas();
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `doodle_${Date.now()}.png`, {
          type: "image/png",
        });
        onSendDoodle(file);
        onClose();
      }
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Üst Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white">Canlı Çizim / Doodle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Çizim Alanı (Canvas) */}
        <div className="relative w-full h-80 sm:h-96 bg-[#0B0E14] touch-none cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full block"
          />
        </div>

        {/* Alt Araç Çubuğu */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
          {/* Renkler & Fırça Boyutu */}
          <div className="flex items-center justify-between gap-3">
            {/* Renk Paleti */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedColor(c);
                    setIsEraser(false);
                  }}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer shrink-0 border ${
                    !isEraser && selectedColor === c
                      ? "scale-125 border-white ring-2 ring-pink-500"
                      : "border-slate-700 hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Fırça Kalınlıkları */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    brushSize === size
                      ? "bg-pink-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: size, height: size }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Eylemler: Silgi, Geri Al, Temizle, Gönder */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                  isEraser
                    ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Silgi"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">Silgi</span>
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Geri Al"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleClear}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition cursor-pointer"
                title="Canvası Temizle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-pink-600/30 hover:scale-105 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Sohbete Gönder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

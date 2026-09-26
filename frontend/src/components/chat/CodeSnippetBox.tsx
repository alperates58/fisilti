"use client";

import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

interface CodeSnippetBoxProps {
  language?: string;
  code: string;
}

export default function CodeSnippetBox({ language = "code", code }: CodeSnippetBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Kod kopyalanamadı:", err);
    }
  };

  const displayLanguage = language.trim() || "kod";

  return (
    <div className="my-2 rounded-xl overflow-hidden bg-black/60 border border-white/15 shadow-lg text-left select-text">
      {/* Kod Başlık Barı: Dil Etiketi ve Kopyala Butonu */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[11px] text-slate-300 font-mono">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Code2 className="w-3.5 h-3.5 text-pink-400" />
          <span className="uppercase text-[10px] tracking-wider">{displayLanguage}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer text-[10px] font-sans"
          title="Kodu Kopyala"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Kopyalandı!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Kopyala</span>
            </>
          )}
        </button>
      </div>

      {/* Kod İçeriği: Güvenli Pre/Code Bloğu (Sıfır Eval / Sıfır dangerouslySetInnerHTML) */}
      <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-emerald-300/90 whitespace-pre scrollbar-thin scrollbar-thumb-white/10">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

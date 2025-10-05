import React, { useState } from "react";
import { X, Twitter, Facebook, Copy, Share2, MessageSquare } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  url?: string;
}

export default function ShareModal({ open, onClose, title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleWebShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, url: shareUrl });
      } catch (e) {
        // user cancelled or error — ignore
      }
      return;
    }

    // fallback to twitter
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title || ""} ${shareUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title || ""} ${shareUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title || "")}`, "_blank", "noopener,noreferrer");
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title || ""} ${shareUrl}`)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-lg bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">{title || "Share"}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-white/5">
            <X className="text-white" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={handleWebShare} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <Share2 size={20} />
            <span className="text-xs">Share</span>
          </button>

          <button onClick={handleTwitter} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <Twitter size={20} />
            <span className="text-xs">Twitter</span>
          </button>

          <button onClick={handleFacebook} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <Facebook size={20} />
            <span className="text-xs">Facebook</span>
          </button>

          <button onClick={handleTelegram} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <MessageSquare size={20} />
            <span className="text-xs">Telegram</span>
          </button>

          <button onClick={handleWhatsApp} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.5 20.5L2 22l1.5-4.5A11 11 0 1 0 20.5 3.5z"/></svg>
            <span className="text-xs">WhatsApp</span>
          </button>

          <button onClick={handleCopy} className="flex flex-col items-center justify-center gap-2 bg-white/5 rounded p-3">
            <Copy size={20} />
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

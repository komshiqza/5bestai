import { Lock } from "lucide-react";

interface BlurredPromptProps {
  prompt: string;
  isBlurred: boolean;
  className?: string;
}

export function BlurredPrompt({ prompt, isBlurred, className = "" }: BlurredPromptProps) {
  if (!prompt) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`p-4 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 ${
          isBlurred ? "select-none" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">
              Prompt
            </div>
            <div
              className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed ${
                isBlurred ? "blur-sm pointer-events-none" : ""
              }`}
              data-testid="text-prompt"
            >
              {prompt}
            </div>
          </div>
          {isBlurred && (
            <Lock className="h-5 w-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
          )}
        </div>
      </div>
      
      {isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 dark:bg-white/10 backdrop-blur-[2px] px-4 py-2 rounded-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-white dark:text-slate-200" />
            <span className="text-sm font-medium text-white dark:text-slate-200">
              Purchase to unlock
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

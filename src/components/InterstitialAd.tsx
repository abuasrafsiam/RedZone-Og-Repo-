import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface InterstitialAdProps {
  onClose: () => void;
}

const InterstitialAd = ({ onClose }: InterstitialAdProps) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="card-gaming p-8 mx-4 max-w-sm w-full text-center space-y-4">
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Sponsored</span>
        <div className="w-full h-40 bg-secondary/50 border border-border rounded-lg flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Ad Content</span>
        </div>
        <button
          onClick={onClose}
          disabled={countdown > 0}
          className="btn-gaming px-6 py-2 text-sm disabled:opacity-40 flex items-center gap-2 mx-auto"
        >
          {countdown > 0 ? `Wait ${countdown}s` : (
            <>
              <X className="w-4 h-4" /> Close Ad
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InterstitialAd;

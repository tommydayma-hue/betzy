import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoinFlipAnimationProps {
  result: "heads" | "tails" | null;
  isFlipping: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export const CoinFlipAnimation = ({ result, isFlipping, onComplete, onDismiss }: CoinFlipAnimationProps) => {
  const [showResult, setShowResult] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [displaySide, setDisplaySide] = useState<"heads" | "tails">("heads");
  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);
  
  // Keep callback refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onDismissRef.current = onDismiss;
  }, [onComplete, onDismiss]);

  // Main animation effect
  useEffect(() => {
    if (isFlipping && result) {
      setShowResult(false);
      setIsVisible(true);
      setDisplaySide("heads");
      
      // Fast flip animation - alternate sides every 80ms
      let count = 0;
      const flipInterval = setInterval(() => {
        count++;
        setDisplaySide(count % 2 === 0 ? "heads" : "tails");
      }, 80);

      // Show result after 1 second of flipping
      const resultTimer = setTimeout(() => {
        clearInterval(flipInterval);
        setDisplaySide(result);
        setShowResult(true);
        onCompleteRef.current?.();
      }, 1000);

      // Auto-hide after 1.5 seconds of showing result
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setShowResult(false);
        onDismissRef.current?.();
      }, 2500);

      return () => {
        clearInterval(flipInterval);
        clearTimeout(resultTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isFlipping, result]);

  // Handle click to dismiss early
  const handleDismiss = () => {
    if (showResult) {
      setIsVisible(false);
      setShowResult(false);
      onDismissRef.current?.();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={handleDismiss}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Coin */}
          <motion.div
            className={cn(
              "w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl",
              displaySide === "heads"
                ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 border-4 border-yellow-600"
                : "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 border-4 border-orange-600"
            )}
            animate={!showResult ? { 
              scale: [1, 1.1, 1],
              rotateY: [0, 180]
            } : { scale: 1 }}
            transition={{ 
              duration: 0.08,
              repeat: !showResult ? Infinity : 0,
            }}
          >
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-5xl md:text-6xl font-bold",
                displaySide === "heads" ? "text-yellow-800" : "text-orange-800"
              )}>
                {displaySide === "heads" ? "H" : "T"}
              </span>
              <span className={cn(
                "text-xs md:text-sm font-bold tracking-wider",
                displaySide === "heads" ? "text-yellow-700" : "text-orange-700"
              )}>
                {displaySide === "heads" ? "HEADS" : "TAILS"}
              </span>
            </div>
          </motion.div>

          {/* Result Text */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <div
                className={cn(
                  "text-3xl md:text-4xl font-bold uppercase tracking-wider",
                  displaySide === "heads" ? "text-yellow-400" : "text-orange-400"
                )}
                style={{ textShadow: "0 0 20px currentColor" }}
              >
                {displaySide}!
              </div>
              <p className="text-white/60 text-xs mt-1">Tap to continue</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

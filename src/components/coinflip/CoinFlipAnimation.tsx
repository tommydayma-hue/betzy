import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoinFlipAnimationProps {
  result: "heads" | "tails" | null;
  isFlipping: boolean;
  onComplete?: () => void;
}

export const CoinFlipAnimation = ({ result, isFlipping, onComplete }: CoinFlipAnimationProps) => {
  const [showResult, setShowResult] = useState(false);
  const [flipCount, setFlipCount] = useState(0);

  useEffect(() => {
    if (isFlipping) {
      setShowResult(false);
      setFlipCount(0);
      
      // Animate through multiple flips
      const flipInterval = setInterval(() => {
        setFlipCount(prev => prev + 1);
      }, 150);

      // Stop flipping and show result after animation
      const timer = setTimeout(() => {
        clearInterval(flipInterval);
        setShowResult(true);
        onComplete?.();
      }, 2000);

      return () => {
        clearInterval(flipInterval);
        clearTimeout(timer);
      };
    }
  }, [isFlipping, onComplete]);

  const currentSide = showResult ? result : (flipCount % 2 === 0 ? "heads" : "tails");

  return (
    <AnimatePresence>
      {(isFlipping || showResult) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Coin Container */}
            <div className="perspective-1000">
              <motion.div
                className="relative w-40 h-40 md:w-52 md:h-52"
                animate={isFlipping && !showResult ? {
                  rotateY: [0, 180, 360, 540, 720, 900, 1080, 1260, 1440],
                  y: [0, -80, 0, -60, 0, -40, 0, -20, 0],
                } : {}}
                transition={{
                  duration: 2,
                  ease: "easeOut",
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Heads Side */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full flex items-center justify-center text-5xl md:text-6xl font-bold shadow-2xl backface-hidden",
                    "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500",
                    "border-4 border-yellow-600"
                  )}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: currentSide === "heads" || !showResult && flipCount % 2 === 0 ? "rotateY(0deg)" : "rotateY(180deg)",
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-800">H</span>
                    <span className="text-xs md:text-sm text-yellow-700 font-medium">HEADS</span>
                  </div>
                  {/* Coin edge effect */}
                  <div className="absolute inset-2 rounded-full border-2 border-yellow-600/30" />
                  <div className="absolute inset-4 rounded-full border border-yellow-600/20" />
                </div>

                {/* Tails Side */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full flex items-center justify-center text-5xl md:text-6xl font-bold shadow-2xl backface-hidden",
                    "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500",
                    "border-4 border-orange-600"
                  )}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: currentSide === "tails" || !showResult && flipCount % 2 === 1 ? "rotateY(0deg)" : "rotateY(180deg)",
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-orange-800">T</span>
                    <span className="text-xs md:text-sm text-orange-700 font-medium">TAILS</span>
                  </div>
                  {/* Coin edge effect */}
                  <div className="absolute inset-2 rounded-full border-2 border-orange-600/30" />
                  <div className="absolute inset-4 rounded-full border border-orange-600/20" />
                </div>
              </motion.div>
            </div>

            {/* Result Text */}
            <AnimatePresence>
              {showResult && result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className={cn(
                      "text-4xl md:text-5xl font-bold uppercase tracking-wider",
                      result === "heads" ? "text-yellow-400" : "text-orange-400"
                    )}
                    style={{ textShadow: "0 0 20px currentColor" }}
                  >
                    {result}!
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white/70 text-sm mt-2"
                  >
                    Click anywhere to continue
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
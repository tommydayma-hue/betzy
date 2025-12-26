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
  const [flipCount, setFlipCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  
  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset state when animation starts
  useEffect(() => {
    if (isFlipping) {
      setShowResult(false);
      setFlipCount(0);
      setIsVisible(true);
      
      // Animate through multiple flips
      const flipInterval = setInterval(() => {
        setFlipCount(prev => prev + 1);
      }, 120);

      // Stop flipping and show result after animation
      const timer = setTimeout(() => {
        clearInterval(flipInterval);
        setShowResult(true);
        onCompleteRef.current?.();
      }, 2000);

      return () => {
        clearInterval(flipInterval);
        clearTimeout(timer);
      };
    }
  }, [isFlipping]);

  // Determine which side to show
  const currentSide = showResult && result ? result : (flipCount % 2 === 0 ? "heads" : "tails");

  // Handle click to dismiss
  const handleDismiss = () => {
    if (showResult && !isFlipping) {
      setIsVisible(false);
      setShowResult(false);
      onDismiss?.();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={handleDismiss}
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
                    "absolute inset-0 rounded-full flex items-center justify-center text-5xl md:text-6xl font-bold shadow-2xl",
                    "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500",
                    "border-4 border-yellow-600"
                  )}
                  style={{
                    backfaceVisibility: "hidden",
                    opacity: currentSide === "heads" ? 1 : 0,
                    transition: showResult ? "opacity 0.3s" : "opacity 0.05s",
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-800 text-6xl md:text-7xl">H</span>
                    <span className="text-sm md:text-base text-yellow-700 font-bold tracking-wider">HEADS</span>
                  </div>
                  {/* Coin edge effect */}
                  <div className="absolute inset-2 rounded-full border-2 border-yellow-600/30" />
                  <div className="absolute inset-4 rounded-full border border-yellow-600/20" />
                </div>

                {/* Tails Side */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full flex items-center justify-center text-5xl md:text-6xl font-bold shadow-2xl",
                    "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500",
                    "border-4 border-orange-600"
                  )}
                  style={{
                    backfaceVisibility: "hidden",
                    opacity: currentSide === "tails" ? 1 : 0,
                    transition: showResult ? "opacity 0.3s" : "opacity 0.05s",
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-orange-800 text-6xl md:text-7xl">T</span>
                    <span className="text-sm md:text-base text-orange-700 font-bold tracking-wider">TAILS</span>
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
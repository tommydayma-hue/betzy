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
  const [rotation, setRotation] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);
  const animationFrameRef = useRef<number>();
  
  // Keep callback refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onDismissRef.current = onDismiss;
  }, [onComplete, onDismiss]);

  // Main animation effect
  useEffect(() => {
    if (isFlipping) {
      setShowResult(false);
      setIsVisible(true);
      setRotation(0);
      
      let startTime: number;
      const duration = 1500; // 1.5 seconds of spinning
      const maxRotations = 8; // Total rotations
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for slowing down
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Calculate rotation with easing
        const targetRotation = maxRotations * 360 * easeOut;
        setRotation(targetRotation);
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - show result
          if (result) {
            // Ensure final rotation lands on correct side
            const finalRotation = result === "heads" ? 0 : 180;
            setRotation(maxRotations * 360 + finalRotation);
            setShowResult(true);
            onCompleteRef.current?.();
          }
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isFlipping, result]);

  // Auto-dismiss after showing result
  useEffect(() => {
    if (showResult) {
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setShowResult(false);
        onDismissRef.current?.();
      }, 2500);
      
      return () => clearTimeout(hideTimer);
    }
  }, [showResult]);

  // Handle click to dismiss early
  const handleDismiss = () => {
    if (showResult) {
      setIsVisible(false);
      setShowResult(false);
      onDismissRef.current?.();
    }
  };

  // Determine which side is showing based on rotation
  const isShowingHeads = Math.floor((rotation % 360) / 180) % 2 === 0;
  const displaySide = showResult ? result : (isShowingHeads ? "heads" : "tails");

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
        onClick={handleDismiss}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Coin Container */}
          <div className="relative" style={{ perspective: "1000px" }}>
            <motion.div
              className="w-36 h-36 md:w-44 md:h-44 relative"
              style={{
                transformStyle: "preserve-3d",
                rotateY: rotation,
              }}
              animate={{ rotateY: rotation }}
              transition={{ duration: 0, ease: "linear" }}
            >
              {/* Heads Side */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full flex items-center justify-center shadow-2xl",
                  "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600",
                  "border-4 border-yellow-700"
                )}
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-5xl md:text-6xl font-bold text-yellow-900">H</span>
                  <span className="text-xs md:text-sm font-bold tracking-wider text-yellow-800">HEADS</span>
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
              </div>

              {/* Tails Side */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full flex items-center justify-center shadow-2xl",
                  "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700",
                  "border-4 border-blue-800"
                )}
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-5xl md:text-6xl font-bold text-blue-100">T</span>
                  <span className="text-xs md:text-sm font-bold tracking-wider text-blue-200">TAILS</span>
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
            </motion.div>
            
            {/* Glow effect */}
            <div className={cn(
              "absolute -inset-4 rounded-full blur-xl opacity-50 -z-10 transition-colors duration-300",
              displaySide === "heads" ? "bg-yellow-400" : "bg-blue-400"
            )} />
          </div>

          {/* Result Text */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-center"
              >
                <div
                  className={cn(
                    "text-4xl md:text-5xl font-bold uppercase tracking-wider",
                    result === "heads" ? "text-yellow-400" : "text-blue-400"
                  )}
                  style={{ textShadow: "0 0 30px currentColor, 0 0 60px currentColor" }}
                >
                  {result}!
                </div>
                <motion.p 
                  className="text-white/60 text-sm mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Tap anywhere to continue
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Spinning indicator */}
          {!showResult && (
            <motion.p
              className="text-white/80 text-lg font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Flipping...
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

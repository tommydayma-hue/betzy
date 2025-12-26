import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoinFlipAnimationProps {
  result: "heads" | "tails" | null;
  isFlipping: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export const CoinFlipAnimation = ({ result, isFlipping, onComplete, onDismiss }: CoinFlipAnimationProps) => {
  const [animationPhase, setAnimationPhase] = useState<"idle" | "entering" | "flipping" | "showing" | "exiting">("idle");
  const [rotation, setRotation] = useState(0);
  const [displayResult, setDisplayResult] = useState<"heads" | "tails" | null>(null);
  
  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);
  const animationFrameRef = useRef<number | null>(null);
  
  // Keep callback refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onDismissRef.current = onDismiss;
  }, [onComplete, onDismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Main animation controller
  useEffect(() => {
    if (isFlipping && result) {
      // Start entrance animation
      setAnimationPhase("entering");
      setRotation(0);
      setDisplayResult(null);
      
      // After entrance, start flipping
      const enterTimer = setTimeout(() => {
        setAnimationPhase("flipping");
        
        let startTime: number | null = null;
        const duration = 1800; // 1.8 seconds of spinning
        const totalRotations = 10;
        
        const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Cubic ease-out for natural deceleration
          const easeOut = 1 - Math.pow(1 - progress, 3);
          
          // Calculate rotation
          const currentRotation = totalRotations * 360 * easeOut;
          setRotation(currentRotation);
          
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Spinning complete - land on result
            const finalRotation = result === "heads" ? totalRotations * 360 : totalRotations * 360 + 180;
            setRotation(finalRotation);
            setDisplayResult(result);
            setAnimationPhase("showing");
            onCompleteRef.current?.();
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
      }, 400); // Wait for entrance animation
      
      return () => {
        clearTimeout(enterTimer);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isFlipping, result]);

  // Auto-dismiss after showing result
  useEffect(() => {
    if (animationPhase === "showing") {
      const timer = setTimeout(() => {
        handleClose();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [animationPhase]);

  const handleClose = useCallback(() => {
    if (animationPhase === "showing" || animationPhase === "flipping") {
      setAnimationPhase("exiting");
      
      // Wait for exit animation to complete
      setTimeout(() => {
        setAnimationPhase("idle");
        setDisplayResult(null);
        setRotation(0);
        onDismissRef.current?.();
      }, 400);
    }
  }, [animationPhase]);

  // Determine which side is visible based on rotation
  const isHeadsSide = Math.round(rotation / 180) % 2 === 0;
  const currentSide = displayResult || (isHeadsSide ? "heads" : "tails");

  const isVisible = animationPhase !== "idle";

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="coin-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg"
          onClick={animationPhase === "showing" ? handleClose : undefined}
          style={{ cursor: animationPhase === "showing" ? "pointer" : "default" }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  i % 2 === 0 ? "bg-yellow-400/30" : "bg-blue-400/30"
                )}
                initial={{ 
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{ 
                  y: -50,
                  transition: {
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "linear"
                  }
                }}
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* Coin Container */}
            <motion.div
              initial={{ scale: 0, y: 100, opacity: 0 }}
              animate={{ 
                scale: animationPhase === "exiting" ? 0.5 : 1, 
                y: animationPhase === "exiting" ? -50 : 0,
                opacity: animationPhase === "exiting" ? 0 : 1
              }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20,
                duration: 0.4
              }}
              className="relative"
              style={{ perspective: "1200px" }}
            >
              {/* Glow effect behind coin */}
              <motion.div 
                className={cn(
                  "absolute -inset-8 rounded-full blur-2xl transition-colors duration-500",
                  currentSide === "heads" ? "bg-yellow-500/40" : "bg-blue-500/40"
                )}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.6, 0.4]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Coin */}
              <motion.div
                className="relative w-40 h-40 md:w-48 md:h-48"
                style={{
                  transformStyle: "preserve-3d",
                  rotateY: rotation,
                }}
                animate={{ rotateY: rotation }}
                transition={{ duration: 0, ease: "linear" }}
              >
                {/* Heads Side */}
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(0deg)",
                    background: "linear-gradient(145deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)",
                    border: "5px solid #b45309",
                    boxShadow: "inset 0 4px 20px rgba(255,255,255,0.3), inset 0 -4px 20px rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.4)"
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-6xl md:text-7xl font-black text-amber-900 drop-shadow-lg">H</span>
                    <span className="text-sm md:text-base font-bold tracking-widest text-amber-800">HEADS</span>
                  </div>
                  {/* Shine overlay */}
                  <div 
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, transparent 100%)"
                    }}
                  />
                </div>

                {/* Tails Side */}
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: "linear-gradient(145deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)",
                    border: "5px solid #1e40af",
                    boxShadow: "inset 0 4px 20px rgba(255,255,255,0.3), inset 0 -4px 20px rgba(0,0,0,0.2), 0 10px 40px rgba(0,0,0,0.4)"
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-6xl md:text-7xl font-black text-blue-100 drop-shadow-lg">T</span>
                    <span className="text-sm md:text-base font-bold tracking-widest text-blue-200">TAILS</span>
                  </div>
                  {/* Shine overlay */}
                  <div 
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, transparent 100%)"
                    }}
                  />
                </div>

                {/* Coin edge effect */}
                <div 
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: "0 0 0 3px rgba(0,0,0,0.1)"
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Status Text */}
            <AnimatePresence mode="wait">
              {animationPhase === "flipping" && (
                <motion.div
                  key="flipping-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <motion.p
                    className="text-2xl font-bold text-white/90"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    ✨ Flipping... ✨
                  </motion.p>
                </motion.div>
              )}
              
              {animationPhase === "showing" && displayResult && (
                <motion.div
                  key="result-text"
                  initial={{ opacity: 0, scale: 0.5, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 15,
                    delay: 0.1
                  }}
                  className="text-center"
                >
                  <motion.div
                    className={cn(
                      "text-5xl md:text-6xl font-black uppercase tracking-wider mb-3",
                      displayResult === "heads" ? "text-yellow-400" : "text-blue-400"
                    )}
                    style={{ 
                      textShadow: `0 0 40px currentColor, 0 0 80px currentColor, 0 4px 12px rgba(0,0,0,0.5)` 
                    }}
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {displayResult}!
                  </motion.div>
                  <motion.p 
                    className="text-white/60 text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Tap anywhere to continue
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

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoinFlipAnimationProps {
  result: "heads" | "tails" | null;
  isFlipping: boolean;
  onDismiss?: () => void;
}

export const CoinFlipAnimation = ({ result, isFlipping, onDismiss }: CoinFlipAnimationProps) => {
  const isVisible = isFlipping && result;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Coin Result */}
            <div
              className={cn(
                "w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl",
                result === "heads" 
                  ? "bg-gradient-to-br from-yellow-400 to-amber-600 border-4 border-amber-700"
                  : "bg-gradient-to-br from-blue-400 to-blue-600 border-4 border-blue-700"
              )}
            >
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-5xl md:text-6xl font-black",
                  result === "heads" ? "text-amber-900" : "text-blue-100"
                )}>
                  {result === "heads" ? "H" : "T"}
                </span>
                <span className={cn(
                  "text-xs md:text-sm font-bold tracking-widest uppercase",
                  result === "heads" ? "text-amber-800" : "text-blue-200"
                )}>
                  {result}
                </span>
              </div>
            </div>

            {/* Result Text */}
            <div className="text-center">
              <p className={cn(
                "text-3xl md:text-4xl font-bold uppercase tracking-wider",
                result === "heads" ? "text-yellow-400" : "text-blue-400"
              )}>
                {result}!
              </p>
              <p className="text-white/50 text-sm mt-2">Tap to continue</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { useEffect, useState } from "react";
import { CheckCircle, Wallet, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface TransactionSuccessProps {
  isVisible: boolean;
  amount: number;
  onComplete?: () => void;
}

export const TransactionSuccess = ({ isVisible, amount, onComplete }: TransactionSuccessProps) => {
  const [showBalance, setShowBalance] = useState(false);
  const { playTransactionSuccessSound } = useSoundEffects();

  useEffect(() => {
    if (isVisible) {
      // Play success sound
      playTransactionSuccessSound();
      
      const balanceTimer = setTimeout(() => setShowBalance(true), 600);
      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => {
        clearTimeout(balanceTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setShowBalance(false);
    }
  }, [isVisible, onComplete, playTransactionSuccessSound]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `hsl(${Math.random() * 60 + 100}, 70%, 50%)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              y: [0, -100],
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 0.5,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative flex flex-col items-center gap-6 p-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        {/* Success checkmark with glow */}
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-success/30 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg shadow-success/30">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.4, duration: 0.5 }}
            >
              <CheckCircle className="w-12 h-12 text-success-foreground" />
            </motion.div>
          </div>
          
          {/* Sparkles around the circle */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 text-warning"
              style={{
                left: `${50 + 60 * Math.cos((angle * Math.PI) / 180)}%`,
                top: `${50 + 60 * Math.sin((angle * Math.PI) / 180)}%`,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
              transition={{ duration: 1, delay: 0.5 + i * 0.1, repeat: 1 }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          ))}
        </motion.div>

        {/* Success text */}
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Deposit Successful!
          </h2>
          <p className="text-muted-foreground">
            Your wallet has been credited
          </p>
        </motion.div>

        {/* Animated amount */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
        >
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg" />
          <div className="relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-primary/20 to-success/20 border border-primary/30">
            <Wallet className="w-6 h-6 text-primary" />
            <motion.span
              className="text-3xl font-bold text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              +₹{amount.toLocaleString()}
            </motion.span>
          </div>
        </motion.div>

        {/* Balance update indicator */}
        <AnimatePresence>
          {showBalance && (
            <motion.div
              className="flex items-center gap-2 text-success"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <span className="text-sm font-medium">Wallet balance updated</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

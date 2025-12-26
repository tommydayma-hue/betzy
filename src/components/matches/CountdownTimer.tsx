import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetTime: Date;
  label: string;
  className?: string;
}

export const CountdownTimer = ({ targetTime, label, className }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetTime.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, isExpired: false };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  const isUrgent = !timeLeft.isExpired && timeLeft.hours === 0 && timeLeft.minutes < 5;

  if (timeLeft.isExpired) {
    return (
      <div className={cn("text-center", className)}>
        <span className="text-xs font-medium text-muted-foreground">{label}: </span>
        <span className="font-bold text-destructive animate-pulse">CLOSED</span>
      </div>
    );
  }

  return (
    <div className={cn("text-center", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}: </span>
      <div className={cn(
        "inline-flex items-center gap-1 font-mono font-bold",
        isUrgent ? "text-destructive animate-pulse" : "text-primary"
      )}>
        <span className="bg-background/50 px-1.5 py-0.5 rounded text-sm">
          {formatNumber(timeLeft.hours)}
        </span>
        <span className="text-xs">:</span>
        <span className="bg-background/50 px-1.5 py-0.5 rounded text-sm">
          {formatNumber(timeLeft.minutes)}
        </span>
        <span className="text-xs">:</span>
        <span className={cn(
          "bg-background/50 px-1.5 py-0.5 rounded text-sm",
          isUrgent && "animate-pulse"
        )}>
          {formatNumber(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
};

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface KpiCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  gradient: string;
  delay?: number;
  compact?: boolean;
}

export default function KpiCard({
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  gradient,
  delay = 0,
  compact = false,
}: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1200;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(value * easeProgress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    const timeout = setTimeout(() => requestAnimationFrame(animate), delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`relative overflow-hidden rounded-2xl border border-white/40 shadow-sm bg-gradient-to-br ${gradient} ${compact ? "p-3" : "p-5"}`}
    >
      <div className="absolute inset-0 bg-white/40" />
      <div className="relative z-10">
        <p className={`font-medium text-slate-600 ${compact ? "text-[10px] uppercase tracking-wide mb-0.5" : "text-sm mb-1.5"}`}>{title}</p>
        <div className={`font-bold text-slate-900 tracking-tight ${compact ? "text-lg" : "text-3xl"}`}>
          {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
        </div>
      </div>
    </motion.div>
  );
}

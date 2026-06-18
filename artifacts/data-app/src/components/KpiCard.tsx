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
}

export default function KpiCard({
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  gradient,
  delay = 0,
}: KpiCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500; // ms
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(value * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timeout = setTimeout(() => {
      requestAnimationFrame(animate);
    }, delay * 1000);
    
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border border-white/40 backdrop-blur-sm bg-gradient-to-br ${gradient}`}
    >
      <div className="absolute inset-0 bg-white/40" />
      <div className="relative z-10">
        <h3 className="text-sm font-medium text-slate-700 mb-2">{title}</h3>
        <div className="text-3xl font-bold text-slate-900 tracking-tight">
          {prefix}
          {displayValue.toFixed(decimals)}
          {suffix}
        </div>
      </div>
    </motion.div>
  );
}

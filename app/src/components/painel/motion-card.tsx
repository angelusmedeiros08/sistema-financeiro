"use client";

import { motion, useReducedMotion } from "motion/react";

export function MotionCard({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  const reduzido = useReducedMotion();

  if (reduzido) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

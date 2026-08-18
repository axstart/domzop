"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const spring = { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 };

export function SpringPress({
  children,
  className = "",
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
      whileHover={reduce || disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
      transition={spring}
    >
      {children}
    </motion.button>
  );
}

export function SpringCard({
  children,
  className = "",
  onClick,
  active,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: active ? 1.01 : 1 }}
      whileHover={reduce ? undefined : { scale: 1.025, y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={spring}
    >
      {children}
    </motion.button>
  );
}

export function SpringChip({
  children,
  className = "",
  onClick,
  active,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      whileHover={reduce ? undefined : { scale: 1.06 }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      animate={{ scale: active ? 1.04 : 1 }}
      transition={spring}
    >
      {children}
    </motion.button>
  );
}

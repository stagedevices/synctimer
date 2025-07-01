import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageVariants } from '../theme/motion';
import { useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function PageAnimator({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduce = useReducedMotion() ?? false;
  const variants = pageVariants(reduce);

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

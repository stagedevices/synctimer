export const motion = {
  easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  durations: {
    pageEnter: 0.3,
    pageExit: 0.25,
    card: 0.3,
    stagger: 0.05,
  },
} as const;

export const pageVariants = (reduce: boolean) => ({
  initial: {
    opacity: 0,
    ...(reduce ? {} : { filter: 'blur(8px)', scale: 0.98 }),
  },
  animate: {
    opacity: 1,
    ...(reduce ? {} : { filter: 'blur(0px)', scale: 1 }),
    transition: {
      duration: motion.durations.pageEnter,
      ease: motion.easing,
      delay: 0.05,
    },
  },
  exit: {
    opacity: 0,
    ...(reduce ? {} : { filter: 'blur(8px)', scale: 0.98 }),
    transition: { duration: motion.durations.pageExit, ease: motion.easing },
  },
});

export const cardVariants = (reduce: boolean) => ({
  hidden: {
    opacity: 0,
    y: 8,
    ...(reduce ? {} : { filter: 'blur(8px)', scale: 0.98 }),
    transition: { duration: motion.durations.card, ease: motion.easing },
  },
  visible: {
    opacity: 1,
    y: 0,
    ...(reduce ? {} : { filter: 'blur(0px)', scale: 1 }),
    transition: { duration: motion.durations.card, ease: motion.easing },
  },
});

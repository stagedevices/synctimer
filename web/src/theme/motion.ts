export const motion = {
  easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  durations: {
    pageEnter: 0.25,
    pageExit: 0.25,
    card: 0.3,
    stagger: 0.05,
  },
} as const;

export const pageVariants = (reduce: boolean) => ({
  initial: {
    opacity: 0,
    x: 32,
    ...(reduce ? {} : { filter: 'blur(8px)', scale: 0.95 }),
  },
  animate: {
    opacity: 1,
    x: 0,
    ...(reduce ? {} : { filter: 'blur(0px)', scale: 1 }),
    transition: {
      duration: motion.durations.pageEnter,
      ease: motion.easing,
      delay: motion.durations.pageExit,
    },
  },
  exit: {
    opacity: 0,
    x: -32,
    ...(reduce ? {} : { filter: 'blur(8px)', scale: 0.95 }),
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

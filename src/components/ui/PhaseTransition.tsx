import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PhaseTransitionProps {
  readonly phaseKey: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Wraps content with a fade+slide-up transition whenever `phaseKey` changes.
 * Uses CSS animations only — no framer-motion.
 */
export function PhaseTransition({ phaseKey, children, className = '' }: PhaseTransitionProps) {
  const [displayedKey, setDisplayedKey] = useState(phaseKey);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const pendingRef = useRef<{ key: string; children: ReactNode } | null>(null);

  useEffect(() => {
    if (phaseKey === displayedKey) return;

    // Kick off exit → swap → enter
    pendingRef.current = { key: phaseKey, children };
    setAnimating(true);

    const timer = setTimeout(() => {
      if (pendingRef.current) {
        setDisplayedKey(pendingRef.current.key);
        setDisplayedChildren(pendingRef.current.children);
        pendingRef.current = null;
      }
      setAnimating(false);
    }, 200); // match exit duration

    return () => clearTimeout(timer);
  }, [phaseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // When animating===false a new children may have arrived without key change
  // (e.g. state updates within the same phase). Pass them through directly.
  const content = animating ? displayedChildren : children;

  return (
    <div
      key={displayedKey}
      className={`animate-phase-enter ${className}`}
      style={animating ? { opacity: 0, transform: 'translateY(-8px)', transition: 'opacity 0.2s, transform 0.2s' } : undefined}
    >
      {content}
    </div>
  );
}

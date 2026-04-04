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

  // phaseKey !== displayedKey means the effect hasn't fired yet (first render after change).
  // In that case keep showing the old displayedChildren to avoid a 1-frame flash of new content.
  // When same phase (no key change), pass children through directly so in-phase state updates work.
  const content = (animating || phaseKey !== displayedKey) ? displayedChildren : children;

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

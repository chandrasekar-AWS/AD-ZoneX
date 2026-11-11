import { useEffect } from 'react';
import { getLenis } from '../utils/smoothScroll';

/** Locks page scrolling while a modal / panel is open (also pauses the smooth-scroll engine). */
export default function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    getLenis()?.stop();
    return () => { document.body.style.overflow = prev; getLenis()?.start(); };
  }, [locked]);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Variant } from '../types/variant';
import { CARD_PLACEHOLDER } from '../utils/placeholder';
import '../styles/CardLightbox.css';

interface CardLightboxProps {
  variants: Variant[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export default function CardLightbox({ variants, index, onNavigate, onClose }: CardLightboxProps) {
  const variant = variants[index];
  const hasPrev = index > 0;
  const hasNext = index < variants.length - 1;

  // Track which variant's image has finished loading; anything else is still
  // loading. Derived comparison avoids a reset-on-change effect.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loaded = !!variant && loadedId === variant.id;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < variants.length) onNavigate(next);
    },
    [index, variants.length, onNavigate]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') {
        // Simple focus trap: only the buttons inside the dialog are tabbable.
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [go, onClose]);

  if (!variant) return null;

  const src = variant.imageUrl || CARD_PLACEHOLDER;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (dx <= -SWIPE_THRESHOLD) go(1);
    else if (dx >= SWIPE_THRESHOLD) go(-1);
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="card-lightbox"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`${variant.cardName} - ${variant.variantName}`}
    >
      <button ref={closeRef} className="card-lightbox-close" onClick={onClose} title="Close (Esc)" aria-label="Close">
        <X size={22} />
      </button>

      {hasPrev && (
        <button
          className="card-lightbox-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          title="Previous"
          aria-label="Previous variant"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {!loaded && <div className="card-lightbox-spinner" aria-hidden="true" />}
      <img
        className={`card-lightbox-image ${loaded ? 'is-loaded' : ''}`}
        src={src}
        alt={`${variant.cardName} - ${variant.variantName}`}
        onClick={(e) => e.stopPropagation()}
        onLoad={() => setLoadedId(variant.id)}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.src !== CARD_PLACEHOLDER) img.src = CARD_PLACEHOLDER;
          setLoadedId(variant.id);
        }}
      />

      {hasNext && (
        <button
          className="card-lightbox-nav next"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          title="Next"
          aria-label="Next variant"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>,
    document.body
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Star, Bookmark, ThumbsDown, ExternalLink, Check } from 'lucide-react';

export interface CardContextMenuItem {
  key: string;
  label: string;
  icon: 'wishlist' | 'favorites' | 'list' | 'disliked' | 'external';
  checked?: boolean;
  disabled?: boolean;
  /** When true, the menu closes after this item is chosen (default: stays
      open, so several lists can be toggled from one right-click). */
  closeOnSelect?: boolean;
  onSelect: () => void;
}

interface CardContextMenuProps {
  x: number;
  y: number;
  items: CardContextMenuItem[];
  onClose: () => void;
}

const ICONS = {
  wishlist: Heart,
  favorites: Star,
  list: Bookmark,
  disliked: ThumbsDown,
  external: ExternalLink,
} as const;

const EST_WIDTH = 232;

export default function CardContextMenu({ x, y, items, onClose }: CardContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Clamp into the viewport once we know the real size.
  useLayoutEffect(() => {
    const el = ref.current;
    const w = el?.offsetWidth ?? EST_WIDTH;
    const h = el?.offsetHeight ?? 0;
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    });
  }, [x, y]);

  // Any interaction outside the menu (or Escape, scroll, resize) closes it.
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDocPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="card-context-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={`card-context-menu-item cm-${item.icon} ${item.checked ? 'checked' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              if (item.closeOnSelect) onClose();
            }}
          >
            <Icon size={15} className="cm-icon" />
            <span className="cm-label">{item.label}</span>
            {item.checked && <Check size={14} className="cm-check" />}
          </button>
        );
      })}
    </div>,
    document.body
  );
}

import { LayoutGrid, Minus, Plus } from 'lucide-react';
import type { CardColumns } from '../hooks/useCardColumns';
import '../styles/CardScaleControl.css';

interface CardScaleControlProps {
  cardColumns: CardColumns;
}

export default function CardScaleControl({ cardColumns }: CardScaleControlProps) {
  const { columns, fewer, more, canGoFewer, canGoMore } = cardColumns;

  return (
    <div className="card-scale-control" title="Cards per row">
      <LayoutGrid size={15} />
      <button onClick={fewer} disabled={!canGoFewer} aria-label="Fewer, bigger cards" title="Fewer per row">
        <Minus size={14} />
      </button>
      <span className="card-scale-value">{columns}</span>
      <button onClick={more} disabled={!canGoMore} aria-label="More, smaller cards" title="More per row">
        <Plus size={14} />
      </button>
    </div>
  );
}

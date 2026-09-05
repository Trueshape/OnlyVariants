import { useContext } from 'react';
import { CardConfigContext, type CardConfig } from '../contexts/cardConfigStore';

export function useCardConfig(): CardConfig {
  const ctx = useContext(CardConfigContext);
  if (!ctx) throw new Error('useCardConfig must be used within a CardConfigProvider');
  return ctx;
}

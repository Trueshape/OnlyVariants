import type { ReactNode } from 'react';
import { CardConfigContext, type CardConfig } from './cardConfigStore';

export function CardConfigProvider({ value, children }: { value: CardConfig; children: ReactNode }) {
  return <CardConfigContext.Provider value={value}>{children}</CardConfigContext.Provider>;
}

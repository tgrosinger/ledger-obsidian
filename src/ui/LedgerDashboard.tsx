import type { TransactionCache } from '../parser';
import React from 'react';

export const LedgerDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  console.log('Creating ledger dashboard');

  React.useEffect(() => {
    // TODO: Redraw using the new txCache
  }, [props.txCache]);

  // TODO: If isMobile, transactions should be rendered differently. Don't use a
  // tabular view on mobile where it won't render very well.

  return <h2>Hello World</h2>;
};

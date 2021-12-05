import { Transaction, TransactionCache } from '../parser';
import { getTotal } from '../transaction-utils';
import { _,Grid } from 'gridjs-react';
import React from 'react';

export const TransactionPage: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  // TODO: Add date range selector and make date in table a hyperlink to select that date.

  const rows = props.txCache.transactions.map((tx: Transaction): any[] => {
    if (tx.value.expenselines.length === 2) {
      // If there are only two lines, then this is a simple 'from->to' transaction
      const amount = tx.value.expenselines[0].amount
        ? tx.value.expenselines[0].amount
        : tx.value.expenselines[1].amount;
      return [
        tx.value.date,
        tx.value.payee,
        getTotal(tx, props.currencySymbol),
        _(<CategoryCell>{tx.value.expenselines[1].category}</CategoryCell>),
        _(<CategoryCell>{tx.value.expenselines[0].category}</CategoryCell>),
      ];
    }
    // Otherwise, there are multiple 'to' lines to consider

    return [tx.value.date, tx.value.payee];
  });

  return (
    <Grid
      data={rows}
      columns={['Date', 'Payee', 'Total', 'From Account', 'To Account']}
      search={true}
      pagination={{
        enabled: true,
        limit: 20,
      }}
      style={{
        th: {
          'border-bottom': '2px solid var(--background-modifier-border)',
        },
      }}
    />
  );
};

const CategoryCell: React.FC<{}> = (props): JSX.Element => (
    <a
      onClick={() => {
        console.log('Clicked: ' + props.children);
      }}
    >
      {props.children}
    </a>
  );

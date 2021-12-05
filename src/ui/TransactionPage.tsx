import { Transaction, TransactionCache } from '../parser';
import { getTotal } from '../transaction-utils';
import { _, Grid } from 'gridjs-react';
import React from 'react';

export const MobileTransactionPage: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => (
  // TODO: Add pagination to see more than just the most recent 10 transactions
  // TODO: Key should be based on transaction itself, not list index
  <div>
    {props.txCache.transactions
      .reverse()
      .slice(0, 10)
      .map(
        (tx: Transaction, i: number): JSX.Element => (
          <MobileTransactionEntry
            key={i}
            tx={tx}
            currencySymbol={props.currencySymbol}
          />
        ),
      )}
  </div>
);

export const MobileTransactionEntry: React.FC<{
  tx: Transaction;
  currencySymbol: string;
}> = (props): JSX.Element => {
  return (
    <div>
      <h3>{props.tx.value.payee}</h3>
      <div>From: {props.tx.value.expenselines.last().account}</div>
      <div>Amount: {getTotal(props.tx, props.currencySymbol)}</div>
    </div>
  );
  return null;
};

export const TransactionPage: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
  goToAccountPage: (accountName: string) => void;
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
        _(
          <AccountCell
            name={tx.value.expenselines[1].account}
            goToAccountPage={props.goToAccountPage}
          />,
        ),
        _(
          <AccountCell
            name={tx.value.expenselines[0].account}
            goToAccountPage={props.goToAccountPage}
          />,
        ),
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

const AccountCell: React.FC<{
  name: string;
  goToAccountPage: (accountName: string) => void;
}> = (props): JSX.Element => (
  <a
    onClick={() => {
      props.goToAccountPage(props.name);
    }}
  >
    {props.name}
  </a>
);

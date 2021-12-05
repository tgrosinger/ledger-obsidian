import type { TransactionCache } from '../parser';
import { TransactionPage } from './TransactionPage';
import React from 'react';

export const LedgerDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  // TODO: If isMobile, transactions should be rendered differently. Don't use a
  // tabular view on mobile where it won't render very well.

  // TODO: Change the default to the overview once implemented.
  const [selectedTab, setSelectedTab] = React.useState('transactions');

  if (!props.txCache) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <Header selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      {selectedTab === 'overview' ? <OverviewPage /> : null}

      {selectedTab === 'transactions' ? (
        <TransactionPage
          currencySymbol={props.currencySymbol}
          txCache={props.txCache}
        />
      ) : (
        <p>Invalid Option Selected</p>
      )}
    </>
  );
};

const Header: React.FC<{
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
}> = (props): JSX.Element => (
    <div>
      <h2>Ledger</h2>
      <Button selected={props.selectedTab === 'transactions'}>
        Transactions
      </Button>
    </div>
  );

const Button: React.FC<{
  selected: boolean;
  action?: () => void;
}> = (props): JSX.Element => (
  <button className={props.selected ? 'mod-cta' : ''} onClick={props.action}>
    {props.children}
  </button>
);

const OverviewPage: React.FC<{}> = (props): JSX.Element => <p>Not yet implemented</p>;

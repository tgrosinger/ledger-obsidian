import type { TransactionCache } from '../parser';
import { AccountPage } from './AccountPage';
import { MobileTransactionPage, TransactionPage } from './TransactionPage';
import { Platform } from 'obsidian';
import React from 'react';

export const LedgerDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  // TODO: If isMobile, transactions should be rendered differently. Don't use a
  // tabular view on mobile where it won't render very well.

  // TODO: Change the default to the overview once implemented.
  const [selectedTab, setSelectedTab] = React.useState('transactions');
  const [selectedAccount, setSelectedAccount] = React.useState('');

  const goToAccountPage = (accountName: string): void => {
    setSelectedTab('accounts');
    setSelectedAccount(accountName);
  };

  if (!props.txCache) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <Header selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      {selectedTab === 'overview' ? <OverviewPage /> : null}

      {selectedTab === 'transactions' ? (
        Platform.isMobile ? (
          <MobileTransactionPage
            currencySymbol={props.currencySymbol}
            txCache={props.txCache}
          />
        ) : (
          <TransactionPage
            currencySymbol={props.currencySymbol}
            txCache={props.txCache}
            goToAccountPage={goToAccountPage}
          />
        )
      ) : null}

      {selectedTab === 'accounts' ? (
        <AccountPage accountName={selectedAccount} txCache={props.txCache} />
      ) : null}
    </>
  );
};

const Header: React.FC<{
  selectedTab: string;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
}> = (props): JSX.Element => (
  <div>
    <h2>Ledger</h2>
    <Button
      selected={props.selectedTab === 'transactions'}
      action={() => {
        props.setSelectedTab('transactions');
      }}
    >
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

const OverviewPage: React.FC<{}> = (props): JSX.Element => (
  <p>Not yet implemented</p>
);

import type { TransactionCache } from '../parser';
import { AccountsList } from './AccountsList';
import { MobileTransactionList, TransactionList } from './TransactionPage';
import { Platform } from 'obsidian';
import React from 'react';
import styled from 'styled-components';
import { AccountVisualization } from './AccountVisualization';

export const LedgerDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  const [selectedAccount, setSelectedAccount] = React.useState('');

  if (!props.txCache) {
    return <p>Loading...</p>;
  }

  return Platform.isMobile ? (
    <MobileDashboard
      currencySymbol={props.currencySymbol}
      txCache={props.txCache}
    />
  ) : (
    <DesktopDashboard
      currencySymbol={props.currencySymbol}
      txCache={props.txCache}
    />
  );
};

const Header: React.FC<{}> = (props): JSX.Element => (
  <div>
    <h2>Ledger</h2>
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

const MobileDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  const [selectedTab, setSelectedTab] = React.useState('transactions');

  return (
    <MobileTransactionList
      currencySymbol={props.currencySymbol}
      txCache={props.txCache}
    />
  );
};

const FlexContainer = styled.div`
  display: flex;
`;
const FlexSidebar = styled.div`
  flex-basis: 20%;
  flex-grow: 0;
  flex-shrink: 1;
`;
const FlexMainContent = styled.div`
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 1;
`;

const DesktopDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  const [selectedAccounts, setSelectedAccounts] = React.useState<string[]>([]);

  // TODO: Make AccountsList collapsible for narrow screens

  return (
    <>
      <Header />

      <FlexContainer>
        <FlexSidebar>
          <AccountsList txCache={props.txCache} />
        </FlexSidebar>
        <FlexMainContent>
          <AccountVisualization />
          <TransactionList
            currencySymbol={props.currencySymbol}
            txCache={props.txCache}
            setSelectedAccount={(account: string) =>
              setSelectedAccounts([account])
            }
          />
        </FlexMainContent>
      </FlexContainer>
    </>
  );
};

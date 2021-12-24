import { Interval } from '../date-utils';
import type { TransactionCache } from '../parser';
import { AccountsList } from './AccountsList';
import { AccountVisualization } from './AccountVisualization';
import { DateRangeSelector } from './DateRangeSelector';
import { MobileTransactionList, TransactionList } from './TransactionList';
import { Platform } from 'obsidian';
import React from 'react';
import styled from 'styled-components';

export const LedgerDashboard: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
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
    <FlexContainer>
      <FlexSidebar>
        <h2>Ledger</h2>
      </FlexSidebar>
      <FlexFloatRight>{props.children}</FlexFloatRight>
    </FlexContainer>
  </div>
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
const FlexFloatRight = styled.div`
  margin-left: auto;
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
  const [startDate, setStartDate] = React.useState(
    window.moment().subtract(2, 'months'),
  );
  const [endDate, setEndDate] = React.useState(window.moment());
  const [interval, setInterval] = React.useState<Interval>('week');

  return (
    <>
      <Header>
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          interval={interval}
          setInterval={setInterval}
        />
      </Header>

      <FlexContainer>
        <FlexSidebar>
          <AccountsList
            txCache={props.txCache}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
          />
        </FlexSidebar>
        <FlexMainContent>
          <AccountVisualization
            txCache={props.txCache}
            selectedAccounts={selectedAccounts}
            startDate={startDate}
            endDate={endDate}
            interval={interval}
          />
          <TransactionList
            currencySymbol={props.currencySymbol}
            txCache={props.txCache}
            selectedAccounts={selectedAccounts}
            setSelectedAccount={(account: string) =>
              setSelectedAccounts([account])
            }
          />
        </FlexMainContent>
      </FlexContainer>
    </>
  );
};

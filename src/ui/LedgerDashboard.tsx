import { Interval } from '../date-utils';
import type { TransactionCache } from '../parser';
import { AccountsList } from './AccountsList';
import { AccountVisualization } from './AccountVisualization';
import { DateRangeSelector } from './DateRangeSelector';
import { NetWorthVisualization } from './NetWorthVisualization';
import { ParseErrors } from './ParseErrors';
import {
  MobileTransactionList,
  RecentTransactionList,
  TransactionList,
} from './TransactionList';
import { Platform } from 'obsidian';
import React from 'react';
import {
  makeDailyAccountBalanceChangeMap,
  makeDailyBalanceMap,
} from 'src/balance-utils';
import { ISettings } from 'src/settings';
import styled from 'styled-components';

export const LedgerDashboard: React.FC<{
  settings: ISettings;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  if (!props.txCache) {
    return <p>Loading...</p>;
  }

  return Platform.isMobile ? (
    <MobileDashboard settings={props.settings} txCache={props.txCache} />
  ) : (
    <DesktopDashboard settings={props.settings} txCache={props.txCache} />
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
  settings: ISettings;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  const [selectedTab, setSelectedTab] = React.useState('transactions');

  /*
  return (
    <MobileTransactionList
      currencySymbol={props.settings.currencySymbol}
      txCache={props.txCache}
    />
  );
  */
  return <p>Dashboard not yet supported on mobile.</p>;
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
  settings: ISettings;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  const dailyAccountBalanceMap = React.useMemo(() => {
    console.time('daily-balance-map');

    const changeMap = makeDailyAccountBalanceChangeMap(
      props.txCache.transactions,
    );
    const balanceMap = makeDailyBalanceMap(
      props.txCache.accounts,
      changeMap,
      props.txCache.firstDate,
      window.moment(),
    );

    console.timeLog('daily-balance-map');
    console.timeEnd('daily-balance-map');

    return balanceMap;
  }, [props.txCache]);

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
          {props.txCache.parsingErrors.length > 0 ? (
            <ParseErrors txCache={props.txCache} />
          ) : null}
          {selectedAccounts.length === 0 ? (
            <>
              <NetWorthVisualization
                dailyAccountBalanceMap={dailyAccountBalanceMap}
                startDate={startDate}
                endDate={endDate}
                interval={interval}
                settings={props.settings}
              />
              <RecentTransactionList
                currencySymbol={props.settings.currencySymbol}
                txCache={props.txCache}
                startDate={startDate}
                endDate={endDate}
              />
            </>
          ) : (
            <>
              <AccountVisualization
                dailyAccountBalanceMap={dailyAccountBalanceMap}
                selectedAccounts={selectedAccounts}
                startDate={startDate}
                endDate={endDate}
                interval={interval}
              />
              <TransactionList
                currencySymbol={props.settings.currencySymbol}
                txCache={props.txCache}
                selectedAccounts={selectedAccounts}
                setSelectedAccount={(account: string) =>
                  setSelectedAccounts([account])
                }
                startDate={startDate}
                endDate={endDate}
              />
            </>
          )}
        </FlexMainContent>
      </FlexContainer>
    </>
  );
};

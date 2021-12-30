import { Interval } from '../date-utils';
import type { TransactionCache } from '../parser';
import { AccountsList } from './AccountsList';
import { AccountVisualization } from './AccountVisualization';
import { DateRangeSelector } from './DateRangeSelector';
import { NetWorthVisualization } from './NetWorthVisualization';
import { ParseErrors } from './ParseErrors';
import {
  FlexContainer,
  FlexFloatRight,
  FlexMainContent,
  FlexShrink,
} from './SharedStyles';
import { RecentTransactionList, TransactionList } from './TransactionList';
import { Step, Steps } from 'intro.js-react';
import { Platform } from 'obsidian';
import React from 'react';
import {
  makeDailyAccountBalanceChangeMap,
  makeDailyBalanceMap,
} from 'src/balance-utils';
import { ISettings } from 'src/settings';
import styled from 'styled-components';

const FlexSidebar = styled(FlexShrink)`
  flex-basis: 20%;
`;

export const LedgerDashboard: React.FC<{
  tutorialIndex: number;
  setTutorialIndex: (index: number) => void;
  settings: ISettings;
  txCache: TransactionCache;
}> = (props): JSX.Element => {
  if (!props.txCache) {
    return <p>Loading...</p>;
  }

  const [tutorialIndex, setTutorialIndex] = React.useState(props.tutorialIndex);
  const setTutorialIndexWrapper = (index: number): void => {
    setTutorialIndex(index); // This updates the current state
    props.setTutorialIndex(index); // This updates the saved state
  };

  return Platform.isMobile ? (
    <MobileDashboard settings={props.settings} txCache={props.txCache} />
  ) : (
    <DesktopDashboard
      tutorialIndex={tutorialIndex}
      setTutorialIndex={setTutorialIndexWrapper}
      settings={props.settings}
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

const DesktopDashboard: React.FC<{
  tutorialIndex: number;
  setTutorialIndex: (index: number) => void;
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
        {props.tutorialIndex !== -1 ? (
          <Tutorial
            tutorialIndex={props.tutorialIndex}
            setTutorialIndex={props.setTutorialIndex}
          />
        ) : null}
      </Header>

      <FlexContainer>
        <FlexSidebar>
          <AccountsList
            txCache={props.txCache}
            settings={props.settings}
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
                allAccounts={props.txCache.accounts}
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

const Tutorial: React.FC<{
  tutorialIndex: number;
  setTutorialIndex: (index: number) => void;
}> = (props): JSX.Element => {
  const steps: Step[] = [
    {
      intro:
        'Welcome to the Obsidian Ledger plugin. Let me show you around a bit!',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro: 'Click on account names to view their transactions and balance.',
      element: '.ledger-account-list',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro: 'Change the interval over which transactions are rolled up.',
      element: '.ledger-interval-selectors',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro: 'Only transactions within this date range will be displayed.',
      element: '.ledger-daterange-selectors',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro: 'Click here to edit your Ledger file as raw text.',
      element: 'a[aria-label="Switch to Markdown View"]',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro:
        'There are more helpful tips in your Ledger file. Go take a look at it in raw text mode.',
      tooltipClass: 'ledger-tutorial-tooltip',
    },
    {
      intro: (
        <p>
          If you have any questions, please visit the{' '}
          <a href="https://github.com/tgrosinger/ledger-obsidian/discussions">
            Github Discussions Page
          </a>
          .
        </p>
      ),
      tooltipClass: 'ledger-tutorial-tooltip',
    },
  ];

  const onExit = (index: number): void => {
    if (index + 1 === steps.length) {
      props.setTutorialIndex(-1);
    } else {
      props.setTutorialIndex(index);
    }
  };

  return (
    <Steps
      enabled={true}
      steps={steps}
      onExit={onExit}
      initialStep={props.tutorialIndex}
    />
  );
};

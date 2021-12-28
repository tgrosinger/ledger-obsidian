import { Interval, makeBucketNames } from '../date-utils';
import { IBarChartOptions, ILineChartOptions } from 'chartist';
import { Moment } from 'moment';
import React from 'react';
import ChartistGraph from 'react-chartist';
import {
  makeBalanceData,
  makeDeltaData,
  removeDuplicateAccounts,
} from 'src/balance-utils';
import styled from 'styled-components';

const ChartHeader = styled.div`
  display: flex;
`;

const Legend = styled.div`
  margin-left: auto;
  flex-shrink: 1;
`;

const ChartTypeSelector = styled.div`
  flex-shrink: 1;
  flex-grow: 0;
`;

const Chart = styled.div`
  .ct-label {
    color: white;
  }
`;

export const AccountVisualization: React.FC<{
  dailyAccountBalanceMap: Map<string, Map<string, number>>;
  selectedAccounts: string[];
  startDate: Moment;
  endDate: Moment;
  interval: Interval;
}> = (props): JSX.Element => {
  // TODO: Set the default mode based on the type of account selected
  const [mode, setMode] = React.useState('balance');

  const filteredAccounts = removeDuplicateAccounts(props.selectedAccounts);
  const dateBuckets = makeBucketNames(
    props.interval,
    props.startDate,
    props.endDate,
  );

  const visualization =
    mode === 'balance' ? (
      <BalanceVisualization
        dailyAccountBalanceMap={props.dailyAccountBalanceMap}
        accounts={filteredAccounts}
        dateBuckets={dateBuckets}
      />
    ) : (
      <DeltaVisualization
        dailyAccountBalanceMap={props.dailyAccountBalanceMap}
        accounts={filteredAccounts}
        dateBuckets={dateBuckets}
        startDate={props.startDate}
        interval={props.interval}
      />
    );

  return (
    <>
      <ChartHeader>
        <ChartTypeSelector>
          <select
            className="dropdown"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
            }}
          >
            <option value="balance">Account Balance</option>
            <option value="pnl">Profit and Loss</option>
          </select>
        </ChartTypeSelector>
        <Legend>
          <ul className="ct-legend">
            {filteredAccounts.map((account, i) => (
              <li key={account} className={`ct-series-${i}`}>
                {account}
              </li>
            ))}
          </ul>
        </Legend>
      </ChartHeader>
      <Chart>{visualization}</Chart>
    </>
  );
};

const BalanceVisualization: React.FC<{
  dailyAccountBalanceMap: Map<string, Map<string, number>>;
  accounts: string[];
  dateBuckets: string[];
}> = (props): JSX.Element => {
  const data = {
    labels: props.dateBuckets,
    series: props.accounts.map((account) =>
      makeBalanceData(props.dailyAccountBalanceMap, props.dateBuckets, account),
    ),
  };

  const options: ILineChartOptions = {
    height: '300px',
    width: '100%',
    showArea: false,
    showPoint: true,
  };

  return <ChartistGraph data={data} options={options} type="Line" />;
};

const DeltaVisualization: React.FC<{
  dailyAccountBalanceMap: Map<string, Map<string, number>>;
  accounts: string[];
  dateBuckets: string[];
  startDate: Moment;
  interval: Interval;
}> = (props): JSX.Element => {
  const data = {
    labels: props.dateBuckets,
    series: props.accounts.map((account) =>
      makeDeltaData(
        props.dailyAccountBalanceMap,
        props.startDate
          .clone()
          .subtract(1, props.interval)
          .format('YYYY-MM-DD'),
        props.dateBuckets,
        account,
      ),
    ),
  };

  const options: IBarChartOptions = {
    height: '300px',
    width: '100%',
  };

  return <ChartistGraph data={data} options={options} type="Bar" />;
};

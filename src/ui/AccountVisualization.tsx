import { Interval, makeBucketNames } from '../date-utils';
import { ILineChartOptions } from 'chartist';
import { Moment } from 'moment';
import React from 'react';
import ChartistGraph from 'react-chartist';
import { makeBalanceData, removeDuplicateAccounts } from 'src/balance-utils';
import { TransactionCache } from 'src/parser';
import { filterByAccount, filterTransactions } from 'src/transaction-utils';
import styled from 'styled-components';

const Chart = styled.div`
  height: 300px;

  text {
    fill: var(--text-muted) !important;
  }
`;

const Chart2 = styled.div`
  .ct-label {
    color: white;
  }
`;

export const AccountVisualization: React.FC<{
  txCache: TransactionCache;
  selectedAccounts: string[];
  startDate: Moment;
  endDate: Moment;
  interval: Interval;
}> = (props): JSX.Element => {
  const filteredAccounts = removeDuplicateAccounts(props.selectedAccounts);
  const dateBuckets = makeBucketNames(
    props.interval,
    props.startDate,
    props.endDate,
  );

  const data = filteredAccounts.map((account) =>
    makeBalanceData(
      filterTransactions(props.txCache.transactions, filterByAccount(account)),
      dateBuckets,
      account,
      0,
    ),
  );

  const data3 = {
    labels: dateBuckets,
    series: data,
  };

  const options: ILineChartOptions = {
    height: '300px',
    width: '800px',
    showArea: false,
    showPoint: true,
  };

  const type = 'Line';

  return (
    <>
      <ul className="ct-legend">
        {filteredAccounts.map((account, i) => (
          <li key={account} className={`ct-series-${i}`}>
            {account}
          </li>
        ))}
      </ul>
      <Chart2>
        <ChartistGraph data={data3} options={options} type={type} />
      </Chart2>
    </>
  );
};

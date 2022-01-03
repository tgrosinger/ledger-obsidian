import { makeNetWorthData } from '../balance-utils';
import { Interval, makeBucketNames } from '../date-utils';
import { ISettings } from '../settings';
import { ILineChartOptions } from 'chartist';
import { Moment } from 'moment';
import React from 'react';
import ChartistGraph from 'react-chartist';
import styled from 'styled-components';

const Chart = styled.div`
  .ct-label {
    color: var(--text-muted);
  }
`;

export const NetWorthVisualization: React.FC<{
  dailyAccountBalanceMap: Map<string, Map<string, number>>;
  startDate: Moment;
  endDate: Moment;
  interval: Interval;
  settings: ISettings;
}> = (props): JSX.Element => {
  const dateBuckets = makeBucketNames(
    props.interval,
    props.startDate,
    props.endDate,
  );
  const data = {
    labels: dateBuckets,
    series: [
      makeNetWorthData(
        props.dailyAccountBalanceMap,
        dateBuckets,
        props.settings,
      ),
    ],
  };

  const options: ILineChartOptions = {
    height: '300px',
    width: '100%',
    showArea: false,
    showPoint: true,
  };

  const type = 'Line';
  return (
    <>
      <h2>Net Worth</h2>
      <i>Assets minus liabilities</i>

      <Chart>
        <ChartistGraph data={data} options={options} type={type} />
      </Chart>
    </>
  );
};

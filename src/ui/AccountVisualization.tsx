import { ResponsiveLine } from '@nivo/line';
import React from 'react';
import {
  grouperByWeek,
  makeBalanceData,
  removeDuplicateAccounts,
} from 'src/balance-utils';
import { TransactionCache } from 'src/parser';
import { filterByAccount, filterTransactions } from 'src/transaction-utils';
import styled from 'styled-components';

interface Node {
  id: string;
  account: string;
  children: Node[];
}

/*
const filterSingleChildParents = (accounts: string[]): string[] => {
    const nodes: Node[] = []
    accounts.forEach((account) => {
        const parts = account.split(":")
        const result = nodes.find((node) => {
            node.account
        })
        if (nodes.find())
    })

    const parts = 

}
*/

const Chart = styled.div`
  height: 300px;

  text {
    fill: var(--text-muted) !important;
  }
`;

export const AccountVisualization: React.FC<{
  txCache: TransactionCache;
  selectedAccounts: string[];
}> = (props): JSX.Element => {
  const filteredAccounts = removeDuplicateAccounts(props.selectedAccounts);
  const data = filteredAccounts.map((account) => ({
      id: account,
      data: makeBalanceData(
        filterTransactions(
          props.txCache.transactions,
          filterByAccount(account),
        ),
        grouperByWeek,
        account,
        0,
      ),
    }));

  return (
    <Chart>
      <ResponsiveLine
        data={data}
        margin={{
          top: 50,
          right: 20,
          bottom: 20 * (filteredAccounts.length + 1),
          left: 60,
        }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: true,
          reverse: false,
        }}
        yFormat=" >-.2f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Balance',
          legendOffset: -50,
          legendPosition: 'middle',
        }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 0,
            translateY: 80,
            itemsSpacing: 0,
            itemDirection: 'right-to-left',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
      />
    </Chart>
  );
};

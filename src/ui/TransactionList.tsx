import { Transaction, TransactionCache } from '../parser';
import {
  filterByAccount,
  filterByEndDate,
  filterByStartDate,
  filterTransactions,
  getTotal,
} from '../transaction-utils';
import { Moment } from 'moment';
import React from 'react';
import { Column, useFilters, useSortBy, useTable } from 'react-table';
import styled from 'styled-components';

export const MobileTransactionList: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => (
  // TODO: Add pagination to see more than just the most recent 10 transactions
  // TODO: Key should be based on transaction itself, not list index
  <div>
    {props.txCache.transactions
      .reverse()
      .slice(0, 10)
      .map(
        (tx: Transaction, i: number): JSX.Element => (
          <MobileTransactionEntry
            key={i}
            tx={tx}
            currencySymbol={props.currencySymbol}
          />
        ),
      )}
  </div>
);

export const MobileTransactionEntry: React.FC<{
  tx: Transaction;
  currencySymbol: string;
}> = (props): JSX.Element => {
  return (
    <div>
      <h3>{props.tx.value.payee}</h3>
      <div>From: {props.tx.value.expenselines.last().account}</div>
      <div>Amount: {getTotal(props.tx, props.currencySymbol)}</div>
    </div>
  );
  return null;
};

const TableStyles = styled.div`
  padding: 1rem;

  table {
    border-spacing: 0;
    border: 1px solid black;

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 0;
      }
    }
  }
`;

interface TableRow {
  date: string;
  payee: string;
  total: string;
  from: string;
  to: string | JSX.Element;
}

const buildTableRows = (
  transactions: Transaction[],
  currencySymbol: string,
): TableRow[] => {
  const tableRows = transactions.map((tx: Transaction) => {
    if (tx.value.expenselines.length === 2) {
      // If there are only two lines, then this is a simple 'from->to' transaction
      return {
        date: tx.value.date,
        payee: tx.value.payee,
        total: getTotal(tx, currencySymbol),
        from: tx.value.expenselines[1].account,
        to: tx.value.expenselines[0].account,
      };
    }
    // Otherwise, there are multiple 'to' lines to consider
    return {
      date: tx.value.date,
      payee: tx.value.payee,
      total: getTotal(tx, currencySymbol),
      from: tx.value.expenselines.last().account,
      to: <i>Multiple</i>,
    };
  });

  // Sort so most recent transactions come first
  tableRows.sort((a, b): number => {
    const aDate = window.moment(a.date);
    const bDate = window.moment(b.date);
    if (aDate.isSame(bDate)) {
      return 0;
    }
    return aDate.isBefore(bDate) ? 1 : -1;
  });

  return tableRows;
};

// TODO: Clicking in a transaction should open it in the transaction modal and allow editing.

export const RecentTransactionList: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
  startDate: Moment;
  endDate: Moment;
}> = (props): JSX.Element => {
  const data = React.useMemo(() => {
    let filteredTransactions = filterTransactions(
      props.txCache.transactions,
      filterByStartDate(props.startDate),
    );
    filteredTransactions = filterTransactions(
      filteredTransactions,
      filterByEndDate(props.endDate),
    );
    if (filteredTransactions.length > 10) {
      filteredTransactions = filteredTransactions.slice(-10);
    }
    return buildTableRows(filteredTransactions, props.currencySymbol);
  }, [props.txCache, props.startDate, props.endDate]);
  return (
    <>
      <h2>Last 10 Transactions for Selected Dates</h2>
      <TransactionTable data={data} />
    </>
  );
};

export const TransactionList: React.FC<{
  currencySymbol: string;
  txCache: TransactionCache;
  selectedAccounts: string[];
  setSelectedAccount: (accountName: string) => void;
  startDate: Moment;
  endDate: Moment;
}> = (props): JSX.Element => {
  const data = React.useMemo(() => {
    // Filters are applied sequentially when they need to be and-ed together.
    // This might not be the most efficient solution...
    let filteredTransactions = filterTransactions(
      props.txCache.transactions,
      ...props.selectedAccounts.map((a) => filterByAccount(a)),
    );
    filteredTransactions = filterTransactions(
      filteredTransactions,
      filterByStartDate(props.startDate),
    );
    filteredTransactions = filterTransactions(
      filteredTransactions,
      filterByEndDate(props.endDate),
    );
    return buildTableRows(filteredTransactions, props.currencySymbol);
  }, [props.txCache, props.selectedAccounts, props.startDate, props.endDate]);

  return <TransactionTable data={data} />;
};

const TransactionTable: React.FC<{
  data: TableRow[];
}> = ({ data }): JSX.Element => {
  if (data.length === 0) {
    // TODO: Style and center this
    return <p>No transactions for the selected time period.</p>;
  }

  const columns = React.useMemo<Column[]>(
    () => [
      {
        Header: 'Date',
        accessor: 'date',
      },
      {
        Header: 'Payee',
        accessor: 'payee',
      },
      {
        Header: 'Total',
        accessor: 'total',
      },
      {
        Header: 'From Account',
        accessor: 'from',
      },
      {
        Header: 'To Account',
        accessor: 'to',
      },
    ],
    [],
  );
  const tableInstance = useTable({ columns, data }, useFilters, useSortBy);

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    tableInstance;

  return (
    <TableStyles>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted ? (column.isSortedDesc ? ' ↑' : ' ↓') : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableStyles>
  );
};

const AccountCell: React.FC<{
  name: string;
  goToAccountPage: (accountName: string) => void;
}> = (props): JSX.Element => (
  <a
    onClick={() => {
      props.goToAccountPage(props.name);
    }}
  >
    {props.name}
  </a>
);

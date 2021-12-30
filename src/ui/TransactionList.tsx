import { Transaction, TransactionCache } from '../parser';
import {
  filterByAccount,
  filterByEndDate,
  filterByStartDate,
  filterTransactions,
  getTotal,
} from '../transaction-utils';
import { Moment } from 'moment';
import { Notice } from 'obsidian';
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
  padding-right: 1rem;

  table {
    width: 100%;
    border-spacing: 0;
    border: 1px solid var(--background-modifier-border);

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
      :hover {
        background: var(--background-secondary);
      }
    }

    th {
      text-align: left;
      background: var(--background-primary-alt);
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid var(--background-modifier-border);
    }
  }

  tr:hover svg {
    fill: var(--text-muted);
  }

  svg {
    margin-left: 10px;
    cursor: pointer;
    fill: none;
    stroke: none;
  }
`;

interface TableRow {
  date: string;
  payee: string;
  total: string;
  from: string;
  to: string | JSX.Element;
  actions: JSX.Element;
}

const buildTableRows = (
  transactions: Transaction[],
  currencySymbol: string,
): TableRow[] => {
  const makeClone = (tx: Transaction): JSX.Element => (
      <>
        <svg
          onClick={() => {
            new Notice(
              'Editing transactions is not yet supported. Coming soon!',
            );
          }}
          width="16"
          height="16"
          version="1.1"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            transform="scale(5.5556)"
            d="m15.533 0.63086c-0.474 0-0.94594 0.18813-1.3047 0.54688l-0.35156 0.35156 2.5938 2.5938 0.35156-0.35156c0.71861-0.71861 0.71861-1.8927 0-2.6113h-2e-3v-0.00195c-0.35848-0.33966-0.83006-0.52735-1.2871-0.52735zm-2.0957 1.457-0.0098 0.00195c-0.10358 0.020715-0.19358 0.06467-0.26172 0.13281l-11.668 11.67c-0.073201 0.0488-0.12225 0.12572-0.14453 0.21484l-0.7207 2.6973c-0.044708 0.15648 0.002068 0.32043 0.11328 0.43164 0.11121 0.11121 0.27321 0.15604 0.42969 0.11133l2.7012-0.71875 0.00391-2e-3c0.071076-0.02369 0.13619-0.06783 0.19727-0.12891l11.682-11.682c0.17582-0.17582 0.17582-0.45699 0-0.63281-0.17582-0.17582-0.45504-0.17582-0.63086 0l-11.547 11.564-1.3301-1.3301 11.564-11.564c0.1309-0.1309 0.17558-0.33127 0.08594-0.49609-0.07115-0.17891-0.24833-0.26953-0.41992-0.26953z"
          />
        </svg>
        <svg
          onClick={() => {
            new Notice(
              'Cloning transactions is not yet supported. Coming soon!',
            );
          }}
          width="16"
          height="16"
          version="1.1"
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m2 2h16v4h2v-4c0-1.1046-0.89543-2-2-2h-16c-1.1046 0-2 0.89543-2 2v16c0 1.1046 0.89543 2 2 2h4v-2h-4z" />
          <path d="m26 8h-16c-1.1046 0-2 0.89543-2 2v16c0 1.1046 0.89543 2 2 2h16c1.1046 0 2-0.89543 2-2v-16c0-1.1046-0.89543-2-2-2zm0 18h-16v-16h16z" />
          <path d="m17 24h2v-5h5v-2h-5v-5h-2v5h-5v2h5z" />
        </svg>
        <svg
          onClick={() => {
            new Notice(
              'Deleting transactions is not yet supported. Coming soon!',
            );
          }}
          width="16"
          height="16"
          version="1.1"
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m6.6465 5.2324-1.4141 1.4141 7.3535 7.3535-7.3535 7.3535 1.4141 1.4141 7.3535-7.3535 7.3535 7.3535 1.4141-1.4141-7.3535-7.3535 7.3535-7.3535-1.4141-1.4141-7.3535 7.3535-7.3535-7.3535z" />
        </svg>
      </>
    );

  const tableRows = transactions.map((tx: Transaction): TableRow => {
    if (tx.value.expenselines.length === 2) {
      // If there are only two lines, then this is a simple 'from->to' transaction
      return {
        date: tx.value.date,
        payee: tx.value.payee,
        total: getTotal(tx, currencySymbol),
        from: tx.value.expenselines[1].account,
        to: tx.value.expenselines[0].account,
        actions: makeClone(tx),
      };
    }
    // Otherwise, there are multiple 'to' lines to consider
    return {
      date: tx.value.date,
      payee: tx.value.payee,
      total: getTotal(tx, currencySymbol),
      from: tx.value.expenselines.last().account,
      to: <i>Multiple</i>,
      actions: makeClone(tx),
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
      {
        Header: '',
        accessor: 'actions',
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

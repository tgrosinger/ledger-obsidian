import type { TransactionCache } from '../parser';
import {
  dealiasAccount,
  makeAccountTree,
  Node,
  sortAccountTree,
} from '../transaction-utils';
import React from 'react';
import { useExpanded, useRowSelect, useTable } from 'react-table';
import styled from 'styled-components';

const TableStyles = styled.div`
  padding: 1rem;

  table {
    width: 100%;

    tr.selected {
      background-color: var(--background-secondary);
    }

    tr:hover {
      background-color: var(--background-primary-alt);
    }

    th,
    td {
      margin: 0;
      padding: 0.25rem;
    }

    td:first-child {
      width: 5px;
    }
  }
`;

const TableH3 = styled.span`
  font-weight: 800;
  margin-left: -1rem;
`;

export const AccountsList: React.FC<{
  txCache: TransactionCache;
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}> = (props): JSX.Element => {
  const columns = React.useMemo(
    () => [
      {
        id: 'expander',
        Cell: ({ row }) =>
          row.canExpand && row.depth > 0 ? (
            <span {...row.getToggleRowExpandedProps()}>
              {row.isExpanded ? '-' : '+'}
            </span>
          ) : null,
      },
      {
        Header: 'Account',
        accessor: 'account',
        Cell: ({ row, value }) =>
          row.depth === 0 ? (
            <TableH3>{value}</TableH3>
          ) : (
            <span
              {...row.getToggleRowExpandedProps({
                style: { paddingLeft: `${row.depth - 1}rem` },
              })}
            >
              {value}
            </span>
          ),
      },
    ],
    [],
  );

  const data = React.useMemo(() => {
    const nodes: Node[] = [];
    props.txCache.accounts.forEach((account: string) => {
      makeAccountTree(nodes, dealiasAccount(account, props.txCache.aliases));
    });
    sortAccountTree(nodes);

    // By default, the top level starts expanded
    nodes.forEach((node) => (node.expanded = true));
    return nodes;
  }, [props.txCache]);

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { expanded, selectedRowIds },
  } = useTable(
    {
      columns,
      data,
    },
    useExpanded,
    useRowSelect,
  );

  // TODO: How can I give `selectedFlatRows` to the parent component?

  return (
    <TableStyles>
      <h2>Accounts</h2>
      <table {...getTableProps()}>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <tr
                className={row.isSelected ? 'selected' : ''}
                {...row.getRowProps()}
              >
                {row.cells.map((cell, j) => (
                  <td
                    onClick={() => {
                      if (j !== 0) {
                        row.toggleRowSelected();
                      }
                    }}
                    {...cell.getCellProps()}
                  >
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableStyles>
  );
};

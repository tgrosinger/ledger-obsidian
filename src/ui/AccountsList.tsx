import type { TransactionCache } from '../parser';
import {
  dealiasAccount,
  makeAccountTree,
  Node,
  sortAccountTree,
} from '../transaction-utils';
import React from 'react';
import { Row, useExpanded, useRowSelect, useTable } from 'react-table';
import { ISettings } from 'src/settings';
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
  settings: ISettings;
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
    state: { expanded },
  } = useTable(
    {
      columns,
      data,
    },
    useExpanded,
    useRowSelect,
  );

  React.useEffect(() => {
    props.setSelectedAccounts(selectedFlatRows.map((row) => row.original.id));
  }, [selectedFlatRows]);

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
                        const account = row.original.id;

                        if (
                          props.txCache.assetAccounts.contains(account) ||
                          props.txCache.liabilityAccounts.contains(account)
                        ) {
                          // Deselect any non asset or liability accounts
                          deselectRowsWithoutPrefix(rows, [
                            props.settings.assetAccountsPrefix,
                            props.settings.liabilityAccountsPrefix,
                          ]);
                        } else {
                          // Deselect any non expense or income accounts
                          deselectRowsWithoutPrefix(rows, [
                            props.settings.expenseAccountsPrefix,
                            props.settings.incomeAccountsPrefix,
                          ]);
                        }
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

const deselectRowsWithoutPrefix = (
  rows: Row<object>[],
  prefixes: string[],
): void => {
  // This doesn't work yet, because toggleRowSelected does not work correctly
  // when you deselect all the children of a selected parent. I think toggling
  // the parent then actually re-selects it.
  /*
  rows.forEach((row) => {
    if (!row.isSelected) {
      return;
    }

    const account: string = row.original.id;

    let found = false;
    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i];
      if (account.startsWith(prefix)) {
        found = true;
        break;
      }
    }

    if (!found) {
      // Not in the provided lists of accounts, so we will deselect it.
      row.toggleRowSelected();
    }
  });
  */
};

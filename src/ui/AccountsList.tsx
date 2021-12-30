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

const TreeRow = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: stretch;

  .selected {
    background-color: var(--background-secondary);
  }
`;

const AccountName = styled.span`
  flex-grow: 1;
  margin-bottom: 2px;
  padding: 1px 6px;

  :hover {
    background-color: var(--background-primary-alt);
  }
`;

const Expander = styled.span`
  flex-grow: 0;
  display: inline-block;
  width: 15px;
`;

const Tree: React.FC<{
  txCache: TransactionCache;
  settings: ISettings;
  data: Node;
  depth: number;
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}> = (props): JSX.Element => {
  const [expanded, setExpanded] = React.useState(props.data.expanded || false);
  const hasChildren = props.data.subRows && props.data.subRows.length > 0;

  const id = props.data.id;
  const selected = props.selectedAccounts.contains(id);
  const toggleSelected = (): void => {
    if (selected) {
      props.setSelectedAccounts(
        props.selectedAccounts.filter((account) => account !== id),
      );
    } else {
      const newSelected = [...props.selectedAccounts, id];
      if (
        props.txCache.assetAccounts.contains(id) ||
        props.txCache.liabilityAccounts.contains(id)
      ) {
        props.setSelectedAccounts(
          deselectRowsWithoutPrefix(newSelected, [
            props.settings.assetAccountsPrefix,
            props.settings.liabilityAccountsPrefix,
          ]),
        );
      } else if (
        props.txCache.expenseAccounts.contains(id) ||
        props.txCache.incomeAccounts.contains(id)
      ) {
        props.setSelectedAccounts(
          deselectRowsWithoutPrefix(newSelected, [
            props.settings.expenseAccountsPrefix,
            props.settings.incomeAccountsPrefix,
          ]),
        );
      } else {
        props.setSelectedAccounts(newSelected);
      }
    }
  };

  // TODO: Figure out why the `i` and `e` rows exist

  return (
    <>
      <TreeRow style={{ paddingLeft: `${props.depth}rem` }}>
        {hasChildren ? (
          <Expander onClick={() => setExpanded(!expanded)}>
            {expanded ? '-' : '+'}
          </Expander>
        ) : (
          <Expander />
        )}
        <AccountName
          className={selected ? 'selected' : ''}
          onClick={toggleSelected}
        >
          {props.data.account}
        </AccountName>
      </TreeRow>
      {hasChildren && expanded
        ? props.data.subRows.map((child) => (
            <Tree
              txCache={props.txCache}
              settings={props.settings}
              data={child}
              key={child.id}
              depth={props.depth + 1}
              selectedAccounts={props.selectedAccounts}
              setSelectedAccounts={props.setSelectedAccounts}
            />
          ))
        : null}
    </>
  );
};

export const AccountsList: React.FC<{
  txCache: TransactionCache;
  settings: ISettings;
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}> = (props): JSX.Element => {
  const data = React.useMemo(() => {
    const nodes: Node[] = [];
    console.log(props.txCache.accounts);
    props.txCache.accounts.forEach((account: string) => {
      makeAccountTree(nodes, dealiasAccount(account, props.txCache.aliases));
    });
    sortAccountTree(nodes);

    // By default, the top level starts expanded
    nodes.forEach((node) => (node.expanded = true));
    return nodes;
  }, [props.txCache]);

  return (
    <div className="ledger-account-list">
      {data.map((root) => (
        <Tree
          txCache={props.txCache}
          settings={props.settings}
          data={root}
          key={root.id}
          depth={0}
          selectedAccounts={props.selectedAccounts}
          setSelectedAccounts={props.setSelectedAccounts}
        />
      ))}
    </div>
  );
};

/**
 * deselecteRowsWithoutPrefix filters the provided list of accounts, removing
 * ones which do not start with one of the provided prefixes. This can be used
 * to make sure the selected accounts are all of the same type, which helps
 * ensure the visualization fits the account type.
 */
const deselectRowsWithoutPrefix = (
  selectedAccounts: string[],
  prefixes: string[],
): string[] =>
  selectedAccounts.filter((account) => {
    for (let i = 0; i < prefixes.length; i++) {
      if (account.startsWith(prefixes[i])) {
        return true;
      }
    }
    return false;
  });

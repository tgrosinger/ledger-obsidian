import grammar from '../grammar/ledger';
import { ISettings } from './settings';
import { flatMap, sortedUniq } from 'lodash';
import { Grammar, Parser } from 'nearley';

export interface TransactionCache {
  transactions: Transaction[];
  payees: string[];
  aliases: Map<string, string>;

  /**
   * Accounts contains a list of all accounts from the file, unmodified.
   * Being unmodified, aliases may or may not be in use.
   */
  accounts: string[];

  /**
   * expenseAccounts is not dealiased and only contains expense accounts.
   */
  expenseAccounts: string[];

  /**
   * assetAccounts is not dealiased and only contains asset accounts.
   */
  assetAccounts: string[];

  /**
   * incomeAccounts is not dealiased and only contains income accounts.
   */
  incomeAccounts: string[];

  /**
   * liabilityAccounts is not dealiased and only contains liability accounts.
   */
  liabilityAccounts: string[];
}

export interface Expenseline {
  amount?: number;
  currency?: string;
  account: string;
  reconcile?: '' | '*' | '!';
  comment?: string;
  id?: number;
}

export interface Transaction {
  type: 'tx';
  value: {
    check?: number;
    date: string;
    payee: string;
    expenselines: Expenseline[];
  };
}

export interface Alias {
  type: 'alias';
  value: {
    left: string;
    right: string;
  };
}

export interface Comment {
  type: 'comment';
  value: string;
}

type Element = Transaction | Alias | Comment;

export const parse = (
  fileContents: string,
  settings: ISettings,
): TransactionCache => {
  const splitFileContents = fileContents.split(/\n[ \t]*\n/); // Split on blank lines
  const results = splitFileContents
    .filter((lines) => lines.trim() !== '')
    .map((lines): Element[] => {
      const parser = new Parser(Grammar.fromCompiled(grammar));

      try {
        const innerresults = parser.feed(lines).finish();
        if (innerresults.length !== 1) {
          console.error(
            `Failed to parse (${innerresults.length} results): "${lines}"`,
          );
          return undefined;
        }

        return innerresults[0];
      } catch (error) {
        console.error(`Failed to parse: "${lines}"`);
        console.error(error);
        return undefined;
      }
    })
    .filter((value) => value !== undefined)
    .flat(1);

  const aliases: Alias[] = [];
  const txs: Transaction[] = [];
  results.forEach((el) => {
    switch (el.type) {
      case 'alias':
        aliases.push(el);
        break;
      case 'tx':
        txs.push(el);
        break;
    }
  });

  const payees = sortedUniq(
    txs
      .map(({ value }) => value.payee)
      .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );
  const accounts = sortedUniq(
    flatMap(txs, ({ value }) =>
      value.expenselines.flatMap((line) => (line.account ? line.account : [])),
    ).sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

  const aliasMap = parseAliases(aliases);

  const assetAccounts: string[] = [];
  const expenseAccounts: string[] = [];
  const incomeAccounts: string[] = [];
  const liabilityAccounts: string[] = [];
  accounts.forEach((c) => {
    const dealiasedA = dealiasAccount(c, aliasMap);
    if (dealiasedA.startsWith(settings.assetAccountsPrefix)) {
      assetAccounts.push(c);
    } else if (dealiasedA.startsWith(settings.expenseAccountsPrefix)) {
      expenseAccounts.push(c);
    } else if (dealiasedA.startsWith(settings.incomeAccountsPrefix)) {
      incomeAccounts.push(c);
    } else if (dealiasedA.startsWith(settings.liabilityAccountsPrefix)) {
      liabilityAccounts.push(c);
    }
  });

  return {
    aliases: aliasMap,
    transactions: txs,
    payees,
    accounts,

    assetAccounts,
    expenseAccounts,
    incomeAccounts,
    liabilityAccounts,
  };
};

const dealiasAccount = (
  account: string,
  aliases: Map<string, string>,
): string => {
  const firstDelimeter = account.indexOf(':');
  if (firstDelimeter > 0) {
    const prefix = account.substring(0, firstDelimeter);
    if (aliases.has(prefix)) {
      return aliases.get(prefix) + account.substring(firstDelimeter);
    }
  }
  return account;
};

const dealiasAccounts = (
  accounts: string[],
  aliases: Map<string, string>,
): string[] =>
  sortedUniq(
    accounts
      .map((cat) => dealiasAccount(cat, aliases))
      .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

const parseAliases = (aliases: Alias[]): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  aliases.forEach((el) => {
    aliasMap.set(el.value.left, el.value.right);
  });
  return aliasMap;
};

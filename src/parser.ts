import grammar from '../grammar/ledger';
import { ISettings } from './settings';
import { flatMap, sortedUniq } from 'lodash';
import { Grammar, Parser } from 'nearley';

export interface TransactionCache {
  transactions: Transaction[];
  payees: string[];
  aliases: Map<string, string>;

  /**
   * categories contains a list of all categories from the file, unmodified.
   * Being unmodified, aliases may or may not be in use.
   */
  categories: string[];

  /**
   * expenseCategories is not dealiased and only contains expense categories.
   */
  expenseCategories: string[];

  /**
   * assetCategories is not dealiased and only contains asset categories.
   */
  assetCategories: string[];

  /**
   * incomeCategories is not dealiased and only contains income categories.
   */
  incomeCategories: string[];

  /**
   * liabilityCategories is not dealiased and only contains liability categories.
   */
  liabilityCategories: string[];
}

export interface Expenseline {
  amount?: number;
  currency?: string;
  category: string;
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
  const categories = sortedUniq(
    flatMap(txs, ({ value }) =>
      value.expenselines.flatMap((line) =>
        line.category ? line.category : [],
      ),
    ).sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

  const aliasMap = parseAliases(aliases);

  const assetCategories: string[] = [];
  const expenseCategories: string[] = [];
  const incomeCategories: string[] = [];
  const liabilityCategories: string[] = [];
  categories.forEach((c) => {
    const dealiasedC = dealiasCategory(c, aliasMap);
    if (dealiasedC.startsWith(settings.assetAccountsPrefix)) {
      assetCategories.push(c);
    } else if (dealiasedC.startsWith(settings.expenseAccountsPrefix)) {
      expenseCategories.push(c);
    } else if (dealiasedC.startsWith(settings.incomeAccountsPrefix)) {
      incomeCategories.push(c);
    } else if (dealiasedC.startsWith(settings.liabilityAccountsPrefix)) {
      liabilityCategories.push(c);
    }
  });

  return {
    aliases: aliasMap,
    transactions: txs,
    payees,
    categories,

    assetCategories,
    expenseCategories,
    incomeCategories,
    liabilityCategories,
  };
};

const dealiasCategory = (
  category: string,
  aliases: Map<string, string>,
): string => {
  const firstDelimeter = category.indexOf(':');
  if (firstDelimeter > 0) {
    const prefix = category.substring(0, firstDelimeter);
    if (aliases.has(prefix)) {
      return aliases.get(prefix) + category.substring(firstDelimeter);
    }
  }
  return category;
};

const dealiasCategories = (
  categories: string[],
  aliases: Map<string, string>,
): string[] =>
  sortedUniq(
    categories
      .map((cat) => dealiasCategory(cat, aliases))
      .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

const parseAliases = (aliases: Alias[]): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  aliases.forEach((el) => {
    aliasMap.set(el.value.left, el.value.right);
  });
  return aliasMap;
};

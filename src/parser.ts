import { flatMap, sortedUniq } from 'lodash';
import { Grammar, Parser } from 'nearley';
import grammar from '../grammar/ledger';

// TODO: Replace manual parsing with the Nearley grammar
// Be sure to create a unit test for parsing a file with multiple transactions

export interface TransactionCache {
  transactions: Transaction[];
  payees: string[];
  categories: string[];
}

interface Expenseline {
  amount: number;
  currency: string;
  category: string;
  reconcile: '' | '*' | '!';
  comment: string;
}

interface Transaction {
  type: 'tx';
  value: {
    check: number;
    date: string;
    payee: string;
    expenselines: Expenseline[];
  };
}

interface Alias {
  type: 'alias';
  value: {
    left: string;
    right: string;
  };
}

interface Comment {
  type: 'comment';
  value: string;
}

type element = Transaction | Alias | Comment;

export const parse = (fileContents: string): TransactionCache => {
  const splitFileContents = fileContents.split(/\n[\W]*\n/); // Split on blank lines
  const results = splitFileContents
    .filter((lines) => lines.trim() !== '')
    .map((lines): element[] => {
      const parser = new Parser(Grammar.fromCompiled(grammar));

      try {
        const results = parser.feed(lines).finish();
        if (results.length !== 1) {
          console.error(
            `Failed to parse (${results.length} results): "${lines}"`,
          );
          return undefined;
        }

        return results[0];
      } catch (error) {
        console.error(`Failed to parse: "${lines}"`);
        return undefined;
      }
    })
    .filter((value) => value !== undefined)
    .flat(1);

  // TODO: Use alias rows to convert categories

  const txs: Transaction[] = results.flatMap((el) =>
    el.type === 'tx' ? el : [],
  );
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

  return {
    transactions: txs,
    payees: payees,
    categories: categories,
  };
};

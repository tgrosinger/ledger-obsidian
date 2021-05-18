import grammar from '../grammar/ledger';
import { flatMap, sortedUniq } from 'lodash';
import { Grammar, Parser } from 'nearley';

export interface TransactionCache {
  transactions: Transaction[];
  payees: string[];
  categories: string[];
}

export interface Expenseline {
  amount: number;
  currency: string;
  category: string;
  reconcile: '' | '*' | '!';
  comment: string;
  id: number | undefined;
}

export interface Transaction {
  type: 'tx';
  value: {
    check: number;
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

export const parse = (fileContents: string): TransactionCache => {
  const splitFileContents = fileContents.split(/\n[\W]*\n/); // Split on blank lines
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
    payees,
    categories,
  };
};

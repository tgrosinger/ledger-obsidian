import grammar from '../grammar/ledger';
import { Error } from './error';
import { ISettings } from './settings';
import {
  dealiasAccount,
  fillMissingAmount,
  firstDate,
} from './transaction-utils';
import { flatMap, sortedUniq } from 'lodash';
import { Moment } from 'moment';
import { Grammar, Parser } from 'nearley';

/**
 * TransactionCache contains information from the parsed ledger file. It
 * includes both the raw data that is necessary to reconstruct the ledger file,
 * as well as data structures more useful for interaction.
 */
export interface TransactionCache {
  transactions: Transaction[];
  firstDate: Moment;
  payees: string[];
  aliases: Map<string, string>;

  /**
   * rawAliases stores the aliases as they come directly from the parser.
   */
  rawAliases: Alias[];

  /**
   * rawComments stores the comments as they come directly from the parser.
   */
  rawComments: Comment[];

  /**
   * parsingErrors contains a list of all errors which occured while parsing the
   * ledger file. If there are any errors, then the results of the transaction
   * cache may not be completely valid due to transactions that could not be
   * parsed. These errors should be displayed to the user so they can be
   * rectified.
   */
  parsingErrors: Error[];

  /**
   * Accounts contains a list of all accounts from the file, dealiased if possible.
   */
  accounts: string[];

  /**
   * expenseAccounts is dealiased and only contains expense accounts.
   */
  expenseAccounts: string[];

  /**
   * assetAccounts is dealiased and only contains asset accounts.
   */
  assetAccounts: string[];

  /**
   * incomeAccounts is dealiased and only contains income accounts.
   */
  incomeAccounts: string[];

  /**
   * liabilityAccounts is dealiased and only contains liability accounts.
   */
  liabilityAccounts: string[];
}

export interface Expenseline {
  amount?: number;
  currency?: string;
  account: string;
  dealiasedAccount?: string;
  reconcile?: '' | '*' | '!';
  comment?: string;
  id?: number;
}

export interface Transaction {
  type: 'tx';
  blockLine?: number;
  block?: FileBlock;
  value: {
    check?: number;
    comment?: string;
    date: string;
    payee: string;
    expenselines: Expenseline[];
  };
}

export interface Alias {
  type: 'alias';
  blockLine?: number;
  block?: FileBlock;
  value: {
    left: string;
    right: string;
  };
}

export interface Comment {
  type: 'comment';
  blockLine?: number;
  block?: FileBlock;
  value: string;
}

export interface FileBlock {
  block: string;
  firstLine: number;
  lastLine: number;
}

type Element = Transaction | Alias | Comment;

export const parse = (
  fileContents: string,
  settings: ISettings,
): TransactionCache => {
  console.time('ledger-file-parse');

  const blocks = splitIntoBlocks(fileContents);
  const errors: Error[] = [];
  const results = blocks
    .map((block): Element[] => {
      const parser = new Parser(Grammar.fromCompiled(grammar));

      // TODO: Sorting may only make sense if comments are not a top-level
      // element. They need to be tied to an alias (move all aliases to the top
      // of the file) or a transaction (sort by date)

      try {
        const innerresults = parser.feed(block.block).finish();
        if (innerresults.length !== 1) {
          // Returning multiple results means that the results were ambiguous
          errors.push({
            message: 'Ambiguous parsing results for block in ledger file',
            block,
          });
          return undefined;
        }
        const elements: Element[] = innerresults[0];
        assignLineNumbersToElements(elements, block);
        return elements;
      } catch (error) {
        errors.push({
          message: 'Failed to parse block in ledger file',
          error,
          block,
        });
        return undefined;
      }
    })
    .filter((value) => value !== undefined)
    .flat(1);

  const aliases: Alias[] = [];
  const comments: Comment[] = [];
  const txs: Transaction[] = [];
  results.forEach((el) => {
    switch (el.type) {
      case 'alias':
        aliases.push(el);
        break;
      case 'comment':
        comments.push(el);
        break;
      case 'tx':
        txs.push(el);
        break;
    }
  });

  const aliasMap = parseAliases(aliases);

  // If a transaction violates assumtions due to being malformed, we will remove
  // it to avoid breaking later logic.
  const txsToRemove: Transaction[] = [];

  txs.forEach((tx) => {
    fillMissingAmount(tx).mapErr((e) => {
      errors.push(e);
      txsToRemove.push(tx);
      return;
    });

    // dealias expense lines
    tx.value.expenselines.forEach((line) => {
      if (!line.account || line.account === '') {
        return;
      }
      const dealiasedAccount = dealiasAccount(line.account, aliasMap);
      if (dealiasedAccount !== line.account) {
        line.dealiasedAccount = dealiasedAccount;
      }
    });
  });

  txsToRemove.forEach((tx) => {
    txs.remove(tx);
  });

  const payees = sortedUniq(
    txs
      .map(({ value }) => value.payee)
      .sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );
  const accounts = sortedUniq(
    flatMap(txs, ({ value }) =>
      value.expenselines.flatMap((line) =>
        line.account ? line.dealiasedAccount || line.account : [],
      ),
    ).sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

  const assetAccounts: string[] = [];
  const expenseAccounts: string[] = [];
  const incomeAccounts: string[] = [];
  const liabilityAccounts: string[] = [];
  accounts.forEach((c) => {
    if (c.startsWith(settings.assetAccountsPrefix)) {
      assetAccounts.push(c);
    } else if (c.startsWith(settings.expenseAccountsPrefix)) {
      expenseAccounts.push(c);
    } else if (c.startsWith(settings.incomeAccountsPrefix)) {
      incomeAccounts.push(c);
    } else if (c.startsWith(settings.liabilityAccountsPrefix)) {
      liabilityAccounts.push(c);
    }
  });

  const firstTxDate = firstDate(txs);

  console.timeLog('ledger-file-parse');
  console.timeEnd('ledger-file-parse');

  return {
    firstDate: firstTxDate,
    aliases: aliasMap,
    rawAliases: aliases,
    rawComments: comments,
    transactions: txs,
    payees,
    accounts,
    parsingErrors: errors,

    assetAccounts,
    expenseAccounts,
    incomeAccounts,
    liabilityAccounts,
  };
};

/**
 * splitIntoBlocks takes in the contents of a file and divides it into blocks
 * which can be fed into the parser. Blocks are annotated with their start and
 * finish line numbers.
 */
export const splitIntoBlocks = (fileContents: string): FileBlock[] => {
  const blocks: FileBlock[] = [];
  let currentBlock: FileBlock;

  fileContents.split('\n').forEach((line, i) => {
    // If there is a blank line, save this block and start a new one
    if (line.trim() === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      return;
    }

    if (!currentBlock) {
      currentBlock = {
        block: line,
        firstLine: i,
        lastLine: i,
      };
      return;
    }

    currentBlock.block += '\n' + line;
    currentBlock.lastLine = i;
  });

  if (currentBlock) {
    // Don't forget the last one if we don't end with a new line
    blocks.push(currentBlock);
  }

  return blocks;
};

/**
 * assignLineNumbersToElements modifies the provided elements, assigning their
 * firstLine and lastLine properties based on their relative blockLine property
 * and the absolute firstLine and lastLine property in the provided FileBlock.
 */
const assignLineNumbersToElements = (
  elements: Element[],
  block: FileBlock,
): void => {
  if (elements.length === 1) {
    elements[0].block = block;
    return;
  }

  // Each Element in a block should have a blockLine property which is 1-offset.
  elements.forEach((element, i): void => {
    const firstLine = block.firstLine + element.blockLine - 1;
    const lastLine =
      i === elements.length - 1
        ? block.lastLine // Last element
        : elements[i + 1].blockLine - 2 + block.firstLine;
    element.block = {
      firstLine,
      lastLine,
      block: block.block
        .split('\n')
        .slice(
          element.blockLine - 1,
          element.blockLine + (lastLine - firstLine),
        )
        .join('\n'),
    };
  });
};

const parseAliases = (aliases: Alias[]): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  aliases.forEach((el) => {
    aliasMap.set(el.value.left, el.value.right);
  });
  return aliasMap;
};

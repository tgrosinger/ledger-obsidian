import grammar from '../grammar/ledger';
import { ISettings } from './settings';
import { dealiasAccount } from './transaction-utils';
import { flatMap, sortedUniq } from 'lodash';
import { Grammar, Parser } from 'nearley';

/**
 * TransactionCache contains information from the parsed ledger file. It
 * includes both the raw data that is necessary to reconstruct the ledger file,
 * as well as data structures more useful for interaction.
 */
export interface TransactionCache {
  transactions: Transaction[];
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
   * If there was an error during parsing then our internal state does not 100%
   * represent the state of the ledger file. We should not attempt to overwrite
   * the file, for example to sort transactions.
   */
  hadParsingError: boolean;

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
  blockLine?: number;
  firstLine?: number;
  lastLine?: number;
  value: {
    check?: number;
    date: string;
    payee: string;
    expenselines: Expenseline[];
  };
}

export interface Alias {
  type: 'alias';
  blockLine?: number;
  firstLine?: number;
  lastLine?: number;
  value: {
    left: string;
    right: string;
  };
}

export interface Comment {
  type: 'comment';
  blockLine?: number;
  firstLine?: number;
  lastLine?: number;
  value: string;
}

interface FileBlock {
  block: string;
  firstLine: number;
  lastLine: number;
}

type Element = Transaction | Alias | Comment;

export const parse = (
  fileContents: string,
  settings: ISettings,
): TransactionCache => {
  const blocks = splitIntoBlocks(fileContents);
  let hadError: boolean = false;
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
          console.error(
            `Failed to parse (${innerresults.length} results): "${block.block}"`,
          );
          return undefined;
        }
        const elements: Element[] = innerresults[0];
        assignLineNumbersToElements(elements, block);
        return elements;
      } catch (error) {
        console.error(`Failed to parse: "${block.block}"`);
        console.error(error);
        hadError = true;
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
    rawAliases: aliases,
    rawComments: comments,
    transactions: txs,
    payees,
    accounts,
    hadParsingError: hadError,

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
    elements[0].firstLine = block.firstLine;
    elements[0].lastLine = block.lastLine;
    return;
  }

  // Each Element in a block should have a blockLine property which is 1-offset.
  elements.forEach((element, i): void => {
    element.firstLine = block.firstLine + element.blockLine - 1;
    element.lastLine =
      i === elements.length - 1
        ? (element.lastLine = block.lastLine) // Last element
        : (element.lastLine = elements[i + 1].blockLine - 2 + block.firstLine);
  });
};

const parseAliases = (aliases: Alias[]): Map<string, string> => {
  const aliasMap = new Map<string, string>();
  aliases.forEach((el) => {
    aliasMap.set(el.value.left, el.value.right);
  });
  return aliasMap;
};

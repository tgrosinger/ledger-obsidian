import { ParseError } from '../src/error';
import {
  AliasWithBlock,
  EnhancedTransaction,
  FileBlock,
  fillMissingAmount,
  parse,
  splitIntoBlocks,
  TransactionWithBlock,
} from '../src/parser';
import { settingsWithDefaults } from '../src/settings';
import * as moment from 'moment';

window.moment = moment;

const emptyBlock: FileBlock = {
  firstLine: -1,
  lastLine: -1,
  block: '',
};

const settings = settingsWithDefaults({});

describe('splitIntoBlocks()', () => {
  test('simple example', () => {
    const input = ['line1', 'line2', 'line3'].join('\n');
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
  });
  test('when there is a trailing new line', () => {
    const input = ['line1', 'line2', 'line3', ''].join('\n');
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(1);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
  });
  test('when there are multiple blocks', () => {
    const input = ['line1', 'line2', 'line3', '', 'line4', 'line5'].join('\n');
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(2);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
    expect(result[1].firstLine).toEqual(4);
    expect(result[1].lastLine).toEqual(5);
    expect(result[1].block).toEqual('line4\nline5');
  });
  test('when there are multiple blank lines between blocks', () => {
    const input = ['line1', 'line2', 'line3', '', '', 'line4', 'line5'].join(
      '\n',
    );
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(2);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
    expect(result[1].firstLine).toEqual(5);
    expect(result[1].lastLine).toEqual(6);
    expect(result[1].block).toEqual('line4\nline5');
  });
  test('when there is whitespace on the blank line - 1', () => {
    const input = ['line1', 'line2', 'line3', '\t', 'line4', 'line5'].join(
      '\n',
    );
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(2);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
    expect(result[1].firstLine).toEqual(4);
    expect(result[1].lastLine).toEqual(5);
    expect(result[1].block).toEqual('line4\nline5');
  });
  test('when there is whitespace on the blank line - 2', () => {
    const input = ['line1', 'line2', 'line3', '    ', 'line4', 'line5'].join(
      '\n',
    );
    const result = splitIntoBlocks(input);
    expect(result).toHaveLength(2);
    expect(result[0].firstLine).toEqual(0);
    expect(result[0].lastLine).toEqual(2);
    expect(result[0].block).toEqual('line1\nline2\nline3');
    expect(result[1].firstLine).toEqual(4);
    expect(result[1].lastLine).toEqual(5);
    expect(result[1].block).toEqual('line4\nline5');
  });
});

describe('parsing a ledger file', () => {
  describe('transactions are populated correctly', () => {
    test('when the file is empty', () => {
      const contents = '';
      const txCache = parse(contents, settings);
      expect(txCache.transactions).toHaveLength(0);
    });
    test('when the final expense line has no amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 2,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.firstDate).toEqual(window.moment('2021/04/20'));
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when the final expense has an amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 2,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when the middle expense has no amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Food:Grocery
      b:CreditUnion       $-30.00`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 3,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'e:Food:Grocery',
              dealiasedAccount: 'e:Food:Grocery',
              amount: 10,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -30,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when there are not enough amounts', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money
      e:Food:Grocery
      b:CreditUnion       $-30.00`;
      const txCache = parse(contents, settings);
      expect(txCache.parsingErrors).toHaveLength(1);
      expect(txCache.transactions).toHaveLength(0);
    });
    test('when there are multiple expense lines', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 3,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'e:Household Goods',
              dealiasedAccount: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -25,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when there are multiple transactions', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      b:CreditUnion       $-45.00`;
      const txCache = parse(contents, settings);
      const expected1: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 2,
          block: contents.split('\n').slice(0, 3).join('\n'),
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expected2: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 4,
          lastLine: 6,
          block: contents.split('\n').slice(4).join('\n'),
        },
        value: {
          date: '2021/04/21',
          payee: 'Food Co-op',
          expenselines: [
            {
              account: 'e:Food:Groceries',
              dealiasedAccount: 'e:Food:Groceries',
              amount: 45,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -45,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.parsingErrors).toEqual([]);
      expect(txCache.transactions).toHaveLength(2);
      expect(txCache.transactions[0]).toEqual(expected1);
      expect(txCache.transactions[1]).toEqual(expected2);
    });
    test('reconciled lines remove special characters', () => {
      const contents = `2021/04/20 Obsidian
    !  e:Spending Money    $20.00
    * e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 3,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '!',
            },
            {
              account: 'e:Household Goods',
              dealiasedAccount: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '*',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -25,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('Comments are preserved', () => {
      const contents = `2021/04/20 Obsidian ; testing
      e:Spending Money    $20.00 ; a comment
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 3,
          block: contents,
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          comment: 'testing',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              comment: 'a comment',
              reconcile: '',
            },
            {
              account: 'e:Household Goods',
              dealiasedAccount: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -25,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('Non-Ascii characters are supported', () => {
      const contents = `2021/01/01 халтура
      счет:наличка:черныйКошель  Р2000.00
      приработок:урлапов`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 2,
          block: contents,
        },
        value: {
          date: '2021/01/01',
          payee: 'халтура',
          expenselines: [
            {
              account: 'счет:наличка:черныйКошель',
              dealiasedAccount: 'счет:наличка:черныйКошель',
              amount: 2000,
              currency: 'Р',
              reconcile: '',
            },
            {
              account: 'приработок:урлапов',
              dealiasedAccount: 'приработок:урлапов',
              amount: -2000,
              currency: 'Р',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.parsingErrors).toEqual([]);
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('A parsing error tags the result accordingly', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00

      An unexpected line
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      b:CreditUnion       $-45.00`;
      const txCache = parse(contents, settings);
      const expected1: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 2,
          block: contents.split('\n').slice(0, 3).join('\n'),
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expected2: EnhancedTransaction = {
        type: 'tx',
        blockLine: 1,
        block: {
          firstLine: 6,
          lastLine: 8,
          block: contents.split('\n').slice(6).join('\n'),
        },
        value: {
          date: '2021/04/21',
          payee: 'Food Co-op',
          expenselines: [
            {
              account: 'e:Food:Groceries',
              dealiasedAccount: 'e:Food:Groceries',
              amount: 45,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -45,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.parsingErrors.length).toEqual(1);
      expect(txCache.parsingErrors[0].message).toEqual(
        'Failed to parse block in ledger file',
      );
      expect(txCache.parsingErrors[0]).toHaveProperty('error');
      expect(txCache.parsingErrors[0]).toHaveProperty('block');
      expect((txCache.parsingErrors[0] as ParseError).block).toEqual({
        block: '      An unexpected line',
        firstLine: 4,
        lastLine: 4,
      });
      expect(txCache.transactions).toHaveLength(2);
      expect(txCache.transactions[0]).toEqual(expected1);
      expect(txCache.transactions[1]).toEqual(expected2);
    });
  });
  describe('payees are populated correctly', () => {
    test('duplicates are removed', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      b:CreditUnion       $-45.00

2021/04/21   Food Co-op
      e:Food:Groceries    $25.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      expect(txCache.payees).toHaveLength(2);
      expect(txCache.payees[0]).toEqual('Food Co-op');
      expect(txCache.payees[1]).toEqual('Obsidian');
    });
  });
  describe('accounts are populated correctly', () => {
    test('duplicates are removed', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      b:CreditUnion       $-45.00

2021/04/21   Food Co-op
      e:Food:Groceries    $25.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      expect(txCache.accounts).toHaveLength(3);
      expect(txCache.accounts[0]).toEqual('b:CreditUnion');
      expect(txCache.accounts[1]).toEqual('e:Food:Groceries');
      expect(txCache.accounts[2]).toEqual('e:Spending Money');
    });
  });
  describe('aliases are parsed and used correctly', () => {
    // TODO: This is testing both aliases and accounts. Split into multiple tests.
    test('accounts are expanded using aliases', () => {
      const contents = `alias e=Expenses
alias c=Liabilities:Credit
alias b=Assets:Banking

2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      c:Chase             $-45.00

2021/04/21   Food Co-op
      e:Food:Groceries    $25.00
      b:CreditUnion       $-25.00`;

      const customSettings = settingsWithDefaults({
        assetAccountsPrefix: 'Assets',
        expenseAccountsPrefix: 'Expenses',
        incomeAccountsPrefix: 'Income',
        liabilityAccountsPrefix: 'Liabilities',
      });

      const txCache = parse(contents, customSettings);
      expect(txCache.accounts).toHaveLength(4);
      expect(txCache.assetAccounts).toEqual(['Assets:Banking:CreditUnion']);
      expect(txCache.expenseAccounts).toEqual([
        'Expenses:Food:Groceries',
        'Expenses:Spending Money',
      ]);
      expect(txCache.liabilityAccounts).toEqual(['Liabilities:Credit:Chase']);
      expect(txCache.incomeAccounts).toEqual([]);
    });
    test('an account that is the same as the alias', () => {
      const contents = `alias e=Expenses
alias b=Assets:Banking
      
2021/04/20 Obsidian
      e                   $20.00
      b:CreditUnion       $-20.00`;

      const customSettings = settingsWithDefaults({
        assetAccountsPrefix: 'Assets',
        expenseAccountsPrefix: 'Expenses',
        incomeAccountsPrefix: 'Income',
        liabilityAccountsPrefix: 'Liabilities',
      });

      const txCache = parse(contents, customSettings);
      expect(txCache.accounts).toEqual([
        'Assets:Banking:CreditUnion',
        'Expenses',
      ]);
      expect(txCache.assetAccounts).toEqual(['Assets:Banking:CreditUnion']);
      expect(txCache.expenseAccounts).toEqual(['Expenses']);
      expect(txCache.liabilityAccounts).toEqual([]);
      expect(txCache.incomeAccounts).toEqual([]);
    });
  });
  describe('multiple elements in a block are parsed correctly', () => {
    // TODO: When there is better preservation of aliases and comments in the tx
    // cache, write more tests to make sure their line numbers are preserved.
    test('when there are multiple aliases and a transaction', () => {
      const contents = `alias e=Expenses
alias b=Banking
2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 3,
        block: {
          firstLine: 2,
          lastLine: 4,
          block: contents.split('\n').splice(2).join('\n'),
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'Expenses:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'Banking:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expectedAlias1: AliasWithBlock = {
        type: 'alias',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 0,
          block: contents.split('\n')[0],
        },
        value: {
          left: 'e',
          right: 'Expenses',
        },
      };
      const expectedAlias2: AliasWithBlock = {
        type: 'alias',
        blockLine: 2,
        block: {
          firstLine: 1,
          lastLine: 1,
          block: contents.split('\n')[1],
        },
        value: {
          left: 'b',
          right: 'Banking',
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
      expect(txCache.rawComments).toHaveLength(0);
      expect(txCache.rawAliases).toHaveLength(2);
      expect(txCache.rawAliases[0]).toEqual(expectedAlias1);
      expect(txCache.rawAliases[1]).toEqual(expectedAlias2);
    });
    test('when there is an alias and a transaction', () => {
      const contents = `alias e=Expenses
2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents, settings);
      const expected: EnhancedTransaction = {
        type: 'tx',
        blockLine: 2,
        block: {
          firstLine: 1,
          lastLine: 3,
          block: contents.split('\n').slice(1).join('\n'),
        },
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              dealiasedAccount: 'Expenses:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              dealiasedAccount: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expectedAlias: AliasWithBlock = {
        type: 'alias',
        blockLine: 1,
        block: {
          firstLine: 0,
          lastLine: 0,
          block: contents.split('\n')[0],
        },
        value: {
          left: 'e',
          right: 'Expenses',
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
      expect(txCache.rawComments).toHaveLength(0);
      expect(txCache.rawAliases).toHaveLength(1);
      expect(txCache.rawAliases[0]).toEqual(expectedAlias);
    });
  });

  test('complicated example transaction', () => {
    const contents = `alias e=Expenses
alias c=Credit
2019/09/16 Costco
    ;Needs more splits
    e:Food:Grocery                              $236.58
    e:Spending Money                         $30.00  ;  Coat
  * c:Citi                  $-266.58`;
    const txCache = parse(contents, settings);
    const expected: EnhancedTransaction = {
      type: 'tx',
      blockLine: 3,
      block: {
        firstLine: 2,
        lastLine: 6,
        block: contents.split('\n').slice(2).join('\n'),
      },
      value: {
        date: '2019/09/16',
        payee: 'Costco',
        expenselines: [
          {
            comment: 'Needs more splits',
          },
          {
            account: 'e:Food:Grocery',
            dealiasedAccount: 'Expenses:Food:Grocery',
            amount: 236.58,
            reconcile: '',
            currency: '$',
          },
          {
            account: 'e:Spending Money',
            dealiasedAccount: 'Expenses:Spending Money',
            amount: 30,
            reconcile: '',
            currency: '$',
            comment: 'Coat',
          },
          {
            account: 'c:Citi',
            dealiasedAccount: 'Credit:Citi',
            amount: -266.58,
            reconcile: '*',
            currency: '$',
          },
        ],
      },
    };
    expect(txCache.transactions).toHaveLength(1);
    expect(txCache.transactions[0]).toEqual(expected);
    expect(txCache.payees).toEqual(['Costco']);
    expect(txCache.accounts).toHaveLength(3);
    expect(txCache.accounts[0]).toEqual('Credit:Citi');
    expect(txCache.accounts[1]).toEqual('Expenses:Food:Grocery');
    expect(txCache.accounts[2]).toEqual('Expenses:Spending Money');
  });
});

describe('fillMissingAmount()', () => {
  describe('When there is a comment line', () => {
    test('and the comment is the first line', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              comment: 'This is a comment',
            },
            {
              account: 'account1',
              amount: 10.5,
              reconcile: '',
            },
            {
              account: 'account3',
              amount: -10.5,
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          comment: 'This is a comment',
        },
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          account: 'account3',
          amount: -10.5,
          reconcile: '',
        },
      ]);
    });
    test('and there is a missing amount', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              reconcile: '',
            },
            {
              comment: 'This is a comment',
            },
            {
              account: 'account3',
              amount: -10.5,
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          comment: 'This is a comment',
        },
        {
          account: 'account3',
          amount: -10.5,
          reconcile: '',
        },
      ]);
    });
    test('and there are no missing amounts', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              amount: 10.5,
              reconcile: '',
            },
            {
              comment: 'This is a comment',
            },
            {
              account: 'account3',
              amount: -10.5,
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          comment: 'This is a comment',
        },
        {
          account: 'account3',
          amount: -10.5,
          reconcile: '',
        },
      ]);
    });
    test('and there is an amount that is zero', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              amount: 10.5,
              reconcile: '',
            },
            {
              account: 'account2',
              reconcile: '',
              amount: 0,
            },
            {
              account: 'account3',
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          account: 'account2',
          reconcile: '',
          amount: 0,
        },
        {
          account: 'account3',
          reconcile: '',
          amount: -10.5,
        },
      ]);
    });
  });
  test('and there is more than one missing amount', () => {
    const input: TransactionWithBlock = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            account: 'account1',
            amount: 10.5,
            reconcile: '',
          },
          {
            account: 'account2',
            reconcile: '',
          },
          {
            account: 'account3',
            reconcile: '',
          },
        ],
      },
    };
    const result = fillMissingAmount(input);
    result.match(fail, (e) => {
      expect(e.message).toEqual(
        'Transaction has multiple expense lines without an amount. At most one is allowed.',
      );
      expect(e.transaction).toEqual(input);
    });
    expect(input.value.expenselines).toEqual([
      {
        account: 'account1',
        amount: 10.5,
        reconcile: '',
      },
      {
        account: 'account2',
        reconcile: '',
      },
      {
        account: 'account3',
        reconcile: '',
      },
    ]);
  });
  describe('When there are only two expense lines', () => {
    test('and the first line is missing', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              reconcile: '',
            },
            {
              account: 'account3',
              amount: -10.5,
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          reconcile: '',
          amount: 10.5,
        },
        {
          account: 'account3',
          amount: -10.5,
          reconcile: '',
        },
      ]);
    });
    test('and the second line is missing', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              amount: 10.5,
              reconcile: '',
            },
            {
              account: 'account3',
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          account: 'account3',
          reconcile: '',
          amount: -10.5,
        },
      ]);
    });
  });
  describe('When there are three expense lines', () => {
    test('and the last line is missing', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              reconcile: '',
              amount: 10.5,
            },
            {
              account: 'account1',
              amount: 5,
              reconcile: '',
            },
            {
              account: 'account3',
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          reconcile: '',
          amount: 10.5,
        },
        {
          account: 'account1',
          amount: 5,
          reconcile: '',
        },
        {
          account: 'account3',
          reconcile: '',
          amount: -15.5,
        },
      ]);
    });
    test('and the middle line is missing', () => {
      const input: TransactionWithBlock = {
        type: 'tx',
        blockLine: -1,
        block: emptyBlock,
        value: {
          date: '2021/12/04',
          payee: 'Testing',
          expenselines: [
            {
              account: 'account1',
              amount: 10.5,
              reconcile: '',
            },
            {
              account: 'account1',
              reconcile: '',
            },
            {
              account: 'account3',
              amount: -15.5,
              reconcile: '',
            },
          ],
        },
      };
      const result = fillMissingAmount(input);
      result.mapErr(fail);
      expect(input.value.expenselines).toEqual([
        {
          account: 'account1',
          amount: 10.5,
          reconcile: '',
        },
        {
          account: 'account1',
          amount: 5,
          reconcile: '',
        },
        {
          account: 'account3',
          amount: -15.5,
          reconcile: '',
        },
      ]);
    });
  });
});

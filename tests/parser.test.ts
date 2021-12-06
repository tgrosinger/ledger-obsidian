import { parse, splitIntoBlocks } from '../src/parser';
import { settingsWithDefaults } from '../src/settings';

// For some reaosn it may be necessary to change the moo import
// in the generated file for the tests to pass.
// const moo = require('moo')

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
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 2,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when the final expense has an amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00`;
      const txCache = parse(contents, settings);
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 2,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
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
    test('when there are multiple expense lines', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, settings);
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 3,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
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
      const expected1 = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 2,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expected2 = {
        type: 'tx',
        blockLine: 1,
        firstLine: 4,
        lastLine: 6,
        value: {
          date: '2021/04/21',
          payee: 'Food Co-op',
          expenselines: [
            {
              account: 'e:Food:Groceries',
              amount: 45,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              amount: -45,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.hadParsingError).toBeFalsy();
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
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 3,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '!',
            },
            {
              account: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '*',
            },
            {
              account: 'b:CreditUnion',
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
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 3,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          comment: 'testing',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              comment: 'a comment',
              reconcile: '',
            },
            {
              account: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
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
      const expected = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 2,
        value: {
          date: '2021/01/01',
          payee: 'халтура',
          expenselines: [
            {
              account: 'счет:наличка:черныйКошель',
              amount: 2000,
              currency: 'Р',
              reconcile: '',
            },
            {
              account: 'приработок:урлапов',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.hadParsingError).toBeFalsy();
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
      const expected1 = {
        type: 'tx',
        blockLine: 1,
        firstLine: 0,
        lastLine: 2,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expected2 = {
        type: 'tx',
        blockLine: 1,
        firstLine: 6,
        lastLine: 8,
        value: {
          date: '2021/04/21',
          payee: 'Food Co-op',
          expenselines: [
            {
              account: 'e:Food:Groceries',
              amount: 45,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              amount: -45,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.hadParsingError).toBeTruthy();
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
      expect(txCache.assetAccounts).toEqual(['b:CreditUnion']);
      expect(txCache.expenseAccounts).toEqual([
        'e:Food:Groceries',
        'e:Spending Money',
      ]);
      expect(txCache.liabilityAccounts).toEqual(['c:Chase']);
      expect(txCache.incomeAccounts).toEqual([]);
    });
  });
  describe('multiple elements in a block are parsed correctly', () => {
    // TODO: When there is better preservation of aliases and comments in the tx
    // cache, write more tests to make sure their line numbers are preserved.
    test('when there is an alias and a transaction', () => {
      const contents = `alias e=Expenses
2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents, settings);
      const expected = {
        type: 'tx',
        blockLine: 2,
        firstLine: 1,
        lastLine: 3,
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              account: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              account: 'b:CreditUnion',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
      // TODO: Check for the alias and its line number
    });
  });

  test('complicated example transaction', () => {
    const contents = `2019/09/16 Costco
    ;Needs more splits
    e:Food:Grocery                              $236.58
    e:Spending Money                         $30.00  ;  Coat
  * c:Citi                  $-266.58`;
    const txCache = parse(contents, settings);
    const expected = {
      type: 'tx',
      blockLine: 1,
      firstLine: 0,
      lastLine: 4,
      value: {
        date: '2019/09/16',
        payee: 'Costco',
        expenselines: [
          {
            comment: 'Needs more splits',
          },
          {
            account: 'e:Food:Grocery',
            amount: 236.58,
            reconcile: '',
            currency: '$',
          },
          {
            account: 'e:Spending Money',
            amount: 30,
            reconcile: '',
            currency: '$',
            comment: 'Coat',
          },
          {
            account: 'c:Citi',
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
    expect(txCache.accounts[0]).toEqual('c:Citi');
    expect(txCache.accounts[1]).toEqual('e:Food:Grocery');
    expect(txCache.accounts[2]).toEqual('e:Spending Money');
  });
});

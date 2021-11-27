import { parse, Transaction } from '../src/parser';

// For some reaosn it may be necessary to change the moo import
// in the generated file for the tests to pass.
// const moo = require('moo')

describe('parsing a ledger file', () => {
  describe('transactions are populated correctly', () => {
    test('when the file is empty', () => {
      const contents = '';
      const txCache = parse(contents);
      expect(txCache.transactions).toHaveLength(0);
    });
    test('when the final expense line has no amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
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
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
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
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
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
      const txCache = parse(contents);
      const expected1 = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
              amount: -20,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      const expected2 = {
        type: 'tx',
        value: {
          date: '2021/04/21',
          payee: 'Food Co-op',
          expenselines: [
            {
              category: 'e:Food:Groceries',
              amount: 45,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
              amount: -45,
              currency: '$',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(2);
      expect(txCache.transactions[0]).toEqual(expected1);
      expect(txCache.transactions[1]).toEqual(expected2);
    });
    test('reconciled lines remove special characters', () => {
      const contents = `2021/04/20 Obsidian
    !  e:Spending Money    $20.00
    * e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              reconcile: '!',
            },
            {
              category: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '*',
            },
            {
              category: 'b:CreditUnion',
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
    test('Comments are ignored', () => {
      const contents = `2021/04/20 Obsidian ; testing
      e:Spending Money    $20.00 ; a comment
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/04/20',
          payee: 'Obsidian',
          comment: 'testing',
          expenselines: [
            {
              category: 'e:Spending Money',
              amount: 20,
              currency: '$',
              comment: 'a comment',
              reconcile: '',
            },
            {
              category: 'e:Household Goods',
              amount: 5,
              currency: '$',
              reconcile: '',
            },
            {
              category: 'b:CreditUnion',
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
      const txCache = parse(contents);
      const expected = {
        type: 'tx',
        value: {
          date: '2021/01/01',
          payee: 'халтура',
          expenselines: [
            {
              category: 'счет:наличка:черныйКошель',
              amount: 2000,
              currency: 'Р',
              reconcile: '',
            },
            {
              category: 'приработок:урлапов',
              reconcile: '',
            },
          ],
        },
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
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
      const txCache = parse(contents);
      expect(txCache.payees).toHaveLength(2);
      expect(txCache.payees[0]).toEqual('Food Co-op');
      expect(txCache.payees[1]).toEqual('Obsidian');
    });
  });
  describe('categories are populated correctly', () => {
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
      const txCache = parse(contents);
      expect(txCache.categories).toHaveLength(3);
      expect(txCache.categories[0]).toEqual('b:CreditUnion');
      expect(txCache.categories[1]).toEqual('e:Food:Groceries');
      expect(txCache.categories[2]).toEqual('e:Spending Money');
    });
  });

  test('complicated example transaction', () => {
    const contents = `2019/09/16 Costco
    ;Needs more splits
    e:Food:Grocery                              $236.58
    e:Spending Money                         $30.00  ;  Coat
  * c:Citi                  $-266.58`;
    const txCache = parse(contents);
    const expected = {
      type: 'tx',
      value: {
        date: '2019/09/16',
        payee: 'Costco',
        expenselines: [
          {
            comment: 'Needs more splits',
          },
          {
            category: 'e:Food:Grocery',
            amount: 236.58,
            reconcile: '',
            currency: '$',
          },
          {
            category: 'e:Spending Money',
            amount: 30,
            reconcile: '',
            currency: '$',
            comment: 'Coat',
          },
          {
            category: 'c:Citi',
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
    expect(txCache.categories).toHaveLength(3);
    expect(txCache.categories[0]).toEqual('c:Citi');
    expect(txCache.categories[1]).toEqual('e:Food:Grocery');
    expect(txCache.categories[2]).toEqual('e:Spending Money');
  });
});

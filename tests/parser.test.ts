import { parse } from '../src/parser';

describe('parsing a ledger file', () => {
  describe('transactions are populated correctly', () => {
    test('when the file is empty', () => {
      const contents = '';
      const txCache = parse(contents, '$');
      expect(txCache.transactions).toHaveLength(0);
    });
    test('when the final expense line has no amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
      const txCache = parse(contents, '$');
      const expected = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'b:CreditUnion', amount: -20, id: 0 },
        ],
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when the final expense has an amount', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00`;
      const txCache = parse(contents, '$');
      const expected = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'b:CreditUnion', amount: -20, id: 0 },
        ],
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('when the final expense is incorrect', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-21.00`;
      const txCache = parse(contents, '$');
      expect(txCache.transactions).toHaveLength(0);
    });
    test('when there are multiple expense lines', () => {
      const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, '$');
      const expected = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'e:Household Goods', amount: 5, id: 0 },
          { category: 'b:CreditUnion', amount: -25, id: 0 },
        ],
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
      const txCache = parse(contents, '$');
      const expected1 = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'b:CreditUnion', amount: -20, id: 0 },
        ],
      };
      const expected2 = {
        date: '2021/04/21',
        payee: 'Food Co-op',
        lines: [
          { category: 'e:Food:Groceries', amount: 45, id: 0 },
          { category: 'b:CreditUnion', amount: -45, id: 0 },
        ],
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
      const txCache = parse(contents, '$');
      const expected = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'e:Household Goods', amount: 5, id: 0 },
          { category: 'b:CreditUnion', amount: -25, id: 0 },
        ],
      };
      expect(txCache.transactions).toHaveLength(1);
      expect(txCache.transactions[0]).toEqual(expected);
    });
    test('Comments are ignored', () => {
      const contents = `2021/04/20 Obsidian ; testing
       e:Spending Money    $20.00 ; a comment
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
      const txCache = parse(contents, '$');
      const expected = {
        date: '2021/04/20',
        payee: 'Obsidian',
        lines: [
          { category: 'e:Spending Money', amount: 20, id: 0 },
          { category: 'e:Household Goods', amount: 5, id: 0 },
          { category: 'b:CreditUnion', amount: -25, id: 0 },
        ],
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
      const txCache = parse(contents, '$');
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
      const txCache = parse(contents, '$');
      expect(txCache.categories).toHaveLength(3);
      expect(txCache.categories[0]).toEqual('b:CreditUnion');
      expect(txCache.categories[1]).toEqual('e:Food:Groceries');
      expect(txCache.categories[2]).toEqual('e:Spending Money');
    });
  });
});

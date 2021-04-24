import { parse } from '../src/parser';

describe('parsing a ledger file', () => {
  test('when the file is empty', () => {
    const contents = '';
    const transactions = parse(contents, '$');
    expect(transactions).toHaveLength(0);
  });
  test('when the final expense line has no amount', () => {
    const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion`;
    const transactions = parse(contents, '$');
    const expected = {
      date: '2021/04/20',
      payee: 'Obsidian',
      lines: [
        { category: 'e:Spending Money', amount: 20, id: 0 },
        { category: 'b:CreditUnion', amount: -20, id: 0 },
      ],
    };
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual(expected);
  });
  test('when the final expense has an amount', () => {
    const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00`;
    const transactions = parse(contents, '$');
    const expected = {
      date: '2021/04/20',
      payee: 'Obsidian',
      lines: [
        { category: 'e:Spending Money', amount: 20, id: 0 },
        { category: 'b:CreditUnion', amount: -20, id: 0 },
      ],
    };
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual(expected);
  });
  test('when the final expense is incorrect', () => {
    const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-21.00`;
    const transactions = parse(contents, '$');
    expect(transactions).toHaveLength(0);
  });
  test('when there are multiple expense lines', () => {
    const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      e:Household Goods   $5.00
      b:CreditUnion       $-25.00`;
    const transactions = parse(contents, '$');
    const expected = {
      date: '2021/04/20',
      payee: 'Obsidian',
      lines: [
        { category: 'e:Spending Money', amount: 20, id: 0 },
        { category: 'e:Household Goods', amount: 5, id: 0 },
        { category: 'b:CreditUnion', amount: -25, id: 0 },
      ],
    };
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual(expected);
  });
  test('when there are multiple transactions', () => {
    const contents = `2021/04/20 Obsidian
      e:Spending Money    $20.00
      b:CreditUnion       $-20.00
      
2021/04/21   Food Co-op
      e:Food:Groceries    $45.00
      b:CreditUnion       $-45.00`;
    const transactions = parse(contents, '$');
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
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toEqual(expected1);
    expect(transactions[1]).toEqual(expected2);
  });
});

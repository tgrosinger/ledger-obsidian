import {
  accountBalance,
  allDealiasedAccountBalances,
  makeBalanceData,
  removeDuplicateAccounts,
} from '../src/balance-utils';
import * as moment from 'moment';
import { Transaction } from 'src/parser';

window.moment = moment;

const tx1: Transaction = {
  type: 'tx',
  value: {
    date: '2021-12-31',
    payee: 'Costco',
    expenselines: [
      {
        account: 'e:Spending Money',
        dealiasedAccount: 'Expenses:Spending Money',
        amount: 100,
        currency: '$',
      },
      {
        account: 'c:Citi',
        dealiasedAccount: 'Credit:Citi',
      },
    ],
  },
};
const tx2: Transaction = {
  type: 'tx',
  value: {
    date: '2021-12-15',
    payee: "Trader Joe's",
    expenselines: [
      {
        account: 'e:Food:Grocery',
        dealiasedAccount: 'Expenses:Food:Grocery',
        amount: 120,
        currency: '$',
      },
      {
        account: 'c:Citi',
        dealiasedAccount: 'Credit:Citi',
      },
    ],
  },
};
const tx3: Transaction = {
  type: 'tx',
  value: {
    date: '2021-11-29',
    payee: 'PCC',
    expenselines: [
      {
        account: 'e:Food:Grocery',
        dealiasedAccount: 'Expenses:Food:Grocery',
        amount: 20,
        currency: '$',
      },
      {
        account: 'c:Citi',
        dealiasedAccount: 'Credit:Citi',
      },
    ],
  },
};

// TODO: Fix the number adding
// TODO: Need to include a sorting function somewhere
describe('makeBalanceData()', () => {
  const months = ['2021-11-01', '2021-12-01'];
  const weeks = [
    '2021-11-29',
    '2021-12-06',
    '2021-12-13',
    '2021-12-20',
    '2021-12-27',
    '2022-01-03',
  ];
  describe('by Month', () => {
    test('Using dealiased accounts', () => {
      const input = [tx1, tx2, tx3];
      const result = makeBalanceData(input, months, 'Credit:Citi', -20);
      const expected = [
        { x: '2021-11-01', y: -40 },
        { x: '2021-12-01', y: -260 },
      ];
      expect(result).toEqual(expected);
    });
    test('Using account alias', () => {
      const input = [tx1, tx2, tx3];
      const result = makeBalanceData(input, months, 'c:Citi', -20);
      const expected = [
        { x: '2021-11-01', y: -40 },
        { x: '2021-12-01', y: -260 },
      ];
      expect(result).toEqual(expected);
    });
  });
  describe('by Week', () => {
    test('Simple test', () => {
      const input = [tx1, tx2, tx3];
      const result = makeBalanceData(input, weeks, 'Credit:Citi', 20);
      const expected = [
        { x: '2021-11-29', y: 0 },
        { x: '2021-12-06', y: 0 },
        { x: '2021-12-13', y: -120 },
        { x: '2021-12-20', y: -120 },
        { x: '2021-12-27', y: -220 },
        { x: '2022-01-03', y: -220 },
      ];
      expect(result).toEqual(expected);
    });
  });
});

describe('allDealiasedAccountBalances()', () => {
  test('With single transaction', () => {
    const input = [tx1];
    const result = allDealiasedAccountBalances(input);
    const expected = new Map([
      ['Expenses:Spending Money', 100],
      ['Credit:Citi', -100],
    ]);
    expect(result).toEqual(expected);
  });
  test('With multiple transactions', () => {
    const input = [tx1, tx2, tx3];
    const result = allDealiasedAccountBalances(input);
    const expected = new Map([
      ['Expenses:Spending Money', 100],
      ['Expenses:Food:Grocery', 140],
      ['Credit:Citi', -240],
    ]);
    expect(result).toEqual(expected);
  });
});

describe('accountBalance()', () => {
  test('When there are no transactions', () => {
    const input: Transaction[] = [];
    const result = accountBalance(input, 'e:Spending Money', 145.34);
    expect(result).toEqual(145.34);
  });
  test('When there are multiple transaction', () => {
    const input = [tx2, tx3];
    const result = accountBalance(input, 'e:Food:Grocery', 10);
    expect(result).toEqual(150);
  });
  test('When the account should be negative', () => {
    const input = [tx1, tx2, tx3];
    const result = accountBalance(input, 'c:Citi', 0);
    expect(result).toEqual(-240);
  });
  test('When using the dealiased account name', () => {
    const input = [tx2, tx3];
    const result = accountBalance(input, 'Expenses:Food:Grocery', 5.5);
    expect(result).toEqual(145.5);
  });
});

describe('removeDuplicateAccounts()', () => {
  test('When there is only one account with one layer', () => {
    const input = ['Liabilities'];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(input);
  });
  test('When there is only one account with multiple layers', () => {
    const input = ['Liabilities:Credit:Chase'];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(input);
  });
  test('When there are two unrelated accounts', () => {
    const input = ['Liabilities:Credit:Chase', 'Expenses:Food'];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(input);
  });
  test('When there are two accounts that overlap', () => {
    const input = ['Liabilities:Credit:Chase', 'Liabilities:Loans'];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(input);
  });
  test('When there are two are parent accounts to keep', () => {
    const input = [
      'Liabilities:Credit:Chase',
      'Liabilities:Loans',
      'Liabilities',
    ];
    const expected = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Loans',
    ];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(expected);
  });
  test('When there are two are parent accounts to keep in a different order', () => {
    const input = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Loans',
    ];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(input);
  });
  test('When there are parent accounts to remove', () => {
    const input = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Credit',
      'Liabilities:Loans',
    ];
    const expected = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Loans',
    ];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(expected);
  });
  test('When there are multiple parents to remove', () => {
    const input = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Credit',
      'Liabilities:Loans:House',
      'Liabilities:Loans',
    ];
    const expected = [
      'Liabilities',
      'Liabilities:Credit:Chase',
      'Liabilities:Loans:House',
    ];
    const result = removeDuplicateAccounts(input);
    expect(result).toEqual(expected);
  });
});

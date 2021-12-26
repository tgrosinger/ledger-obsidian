import {
  DailyAccountBalanceChangeMap,
  makeDailyAccountBalanceChangeMap,
  makeDailyBalanceMap,
  removeDuplicateAccounts,
} from '../src/balance-utils';
import { Transaction } from '../src/parser';
import { fillMissingAmount } from '../src/transaction-utils';
import * as moment from 'moment';

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

describe('Balance maps', () => {
  const tx4: Transaction = {
    type: 'tx',
    value: {
      date: '2021-12-16',
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
  const tx5: Transaction = {
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
  const tx6: Transaction = {
    type: 'tx',
    value: {
      date: '2021-12-10',
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

  fillMissingAmount(tx4);
  fillMissingAmount(tx5);
  fillMissingAmount(tx6);

  const expectedDailyAccountBalanceChangeMap: DailyAccountBalanceChangeMap =
    new Map([
      [
        '2021-12-10',
        new Map([
          ['Expenses:Food:Grocery', 20],
          ['Credit:Citi', -20],
        ]),
      ],
      [
        '2021-12-15',
        new Map([
          ['Expenses:Food:Grocery', 120],
          ['Credit:Citi', -120],
        ]),
      ],
      [
        '2021-12-16',
        new Map([
          ['Expenses:Spending Money', 100],
          ['Credit:Citi', -100],
        ]),
      ],
    ]);

  describe('makeDailyAccountBalanceChangeMap()', () => {
    test('simple test', () => {
      const input = [tx4, tx5, tx6];
      const result = makeDailyAccountBalanceChangeMap(input);
      expect(result).toEqual(expectedDailyAccountBalanceChangeMap);
    });
  });

  describe('makeDailyBalanceMap()', () => {
    test('simple test', () => {
      const accounts = [
        'Credit:Citi',
        'Expenses:Spending Money',
        'Expenses:Food:Grocery',
      ];
      const result = makeDailyBalanceMap(
        accounts,
        expectedDailyAccountBalanceChangeMap,
        window.moment('2021-12-08'),
        window.moment('2021-12-20'),
      );
      const expected = new Map([
        [
          '2021-12-08',
          new Map([
            ['Credit:Citi', 0],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 0],
          ]),
        ],
        [
          '2021-12-09',
          new Map([
            ['Credit:Citi', 0],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 0],
          ]),
        ],
        [
          '2021-12-10',
          new Map([
            ['Credit:Citi', -20],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 20],
          ]),
        ],
        [
          '2021-12-11',
          new Map([
            ['Credit:Citi', -20],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 20],
          ]),
        ],
        [
          '2021-12-12',
          new Map([
            ['Credit:Citi', -20],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 20],
          ]),
        ],
        [
          '2021-12-13',
          new Map([
            ['Credit:Citi', -20],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 20],
          ]),
        ],
        [
          '2021-12-14',
          new Map([
            ['Credit:Citi', -20],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 20],
          ]),
        ],
        [
          '2021-12-15',
          new Map([
            ['Credit:Citi', -140],
            ['Expenses:Spending Money', 0],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
        [
          '2021-12-16',
          new Map([
            ['Credit:Citi', -240],
            ['Expenses:Spending Money', 100],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
        [
          '2021-12-17',
          new Map([
            ['Credit:Citi', -240],
            ['Expenses:Spending Money', 100],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
        [
          '2021-12-18',
          new Map([
            ['Credit:Citi', -240],
            ['Expenses:Spending Money', 100],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
        [
          '2021-12-19',
          new Map([
            ['Credit:Citi', -240],
            ['Expenses:Spending Money', 100],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
        [
          '2021-12-20',
          new Map([
            ['Credit:Citi', -240],
            ['Expenses:Spending Money', 100],
            ['Expenses:Food:Grocery', 140],
          ]),
        ],
      ]);
      expect(result).toEqual(expected);
    });
  });
});

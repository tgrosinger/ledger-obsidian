import { Transaction } from '../src/parser';
import {
  filterByAccount,
  filterByPayeeExact,
  filterTransactions,
  getCurrency,
  getTotal,
  makeAccountTree,
  Node,
  sortAccountTree,
} from '../src/transaction-utils';

describe('getTotal()', () => {
  test('When the last line has an amount', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: '$',
            account: 'account1',
          },
          {
            account: 'account2',
          },
          {
            amount: -60,
            currency: '$',
            account: 'account3',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$60.00');
  });
  test('When the last line does not have an amount', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: '$',
            account: 'account1',
          },
          {
            amount: 20,
            currency: '$',
            account: 'account2',
          },
          {
            account: 'account3',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$60.00');
  });
  test('When there are not enough amounts', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: '$',
            account: 'account1',
          },
          {
            account: 'account2',
          },
          {
            account: 'account3',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$40.00');
  });
  test('When none of the transactions have a currency', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            account: 'account1',
          },
          {
            account: 'account3',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$40.00');
  });
  test('When the transaction should be negative', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            account: 'account1',
          },
          {
            amount: 40,
            account: 'account3',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$-40.00');
  });
});

describe('getCurrency()', () => {
  test('When the first expense line has a currency', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: 'L',
            account: 'account1',
          },
          {
            account: 'account3',
          },
        ],
      },
    };
    const result = getCurrency(tx, '$');
    expect(result).toEqual('L');
  });
  test('When the second expense line has a currency', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            account: 'account1',
          },
          {
            amount: 40,
            currency: 'L',
            account: 'account3',
          },
        ],
      },
    };
    const result = getCurrency(tx, '$');
    expect(result).toEqual('L');
  });
  test('When the transaction does not specify a currency', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            account: 'account1',
          },
          {
            account: 'account3',
          },
        ],
      },
    };
    const result = getCurrency(tx, '$');
    expect(result).toEqual('$');
  });
});

describe('makeAccountTree()', () => {
  test('When the tree is empty', () => {
    const input: Node[] = [];
    makeAccountTree(input, 'e:Food:Grocery');
    const expected = [
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
        ],
      },
    ];
    expect(input).toEqual(expected);
  });
  test('When adding to existing leaf', () => {
    const input = [
      { id: 'e', account: 'e', subRows: [{ id: 'e:Food', account: 'Food' }] },
    ];
    makeAccountTree(input, 'e:Food:Grocery');
    const expected = [
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
        ],
      },
    ];
    expect(input).toEqual(expected);
  });
  test('When adding a new branch', () => {
    const input = [
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
        ],
      },
    ];
    makeAccountTree(input, 'e:Bills:Electricity');
    const expected = [
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
          {
            id: 'e:Bills',
            account: 'Bills',
            subRows: [{ id: 'e:Bills:Electricity', account: 'Electricity' }],
          },
        ],
      },
    ];
    expect(input).toEqual(expected);
  });
});

describe('sortAccountTree()', () => {
  test('Basic sort', () => {
    const input = [
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
          {
            id: 'e:Bills',
            account: 'Bills',
            subRows: [{ id: 'e:Bills:Electricity', account: 'Electricity' }],
          },
        ],
      },
      { id: 'alpha', account: 'alpha' },
    ];
    sortAccountTree(input);
    const expected = [
      { id: 'alpha', account: 'alpha' },
      {
        id: 'e',
        account: 'e',
        subRows: [
          {
            id: 'e:Bills',
            account: 'Bills',
            subRows: [{ id: 'e:Bills:Electricity', account: 'Electricity' }],
          },
          {
            id: 'e:Food',
            account: 'Food',
            subRows: [{ id: 'e:Food:Grocery', account: 'Grocery' }],
          },
        ],
      },
    ];
    expect(input).toEqual(expected);
  });
});

describe('filterTransactions', () => {
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
          dealiasedAccount: 'Credit:City',
        },
      ],
    },
  };
  const tx2: Transaction = {
    type: 'tx',
    value: {
      date: '2021-12-30',
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
          dealiasedAccount: 'Credit:City',
        },
      ],
    },
  };
  const tx3: Transaction = {
    type: 'tx',
    value: {
      date: '2021-12-29',
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
          dealiasedAccount: 'Credit:City',
        },
      ],
    },
  };
  test('When there are no filters', () => {
    const input = [tx1, tx2, tx3];
    const result = filterTransactions(input);
    expect(result).toEqual(input);
  });

  describe('filterByAccount', () => {
    test('When the account matches', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByAccount('e:Spending Money'),
      );
      expect(result).toEqual([tx1]);
    });
    test('When the no accounts match', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByAccount('e:House:Maintenance'),
      );
      expect(result).toEqual([]);
    });
    test('When there are multiple matches', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByAccount('e:Food:Grocery'),
      );
      expect(result).toEqual([tx2, tx3]);
    });
    test('When filtering by dealiased account name', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByAccount('Expenses:Food:Grocery'),
      );
      expect(result).toEqual([tx2, tx3]);
    });
  });

  describe('filterByPayee', () => {
    test('When the payee matches', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(input, filterByPayeeExact('Costco'));
      expect(result).toEqual([tx1]);
    });
    test('When there are no matches', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByPayeeExact('Home Depot'),
      );
      expect(result).toEqual([]);
    });
  });

  describe('mutliple filters', () => {
    test('When the payee and account match different transactions', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByPayeeExact('PCC'),
        filterByAccount('e:Spending Money'),
      );
      expect(result).toEqual([tx1, tx3]);
    });
    test('When matching multiple of the same filter', () => {
      const input = [tx1, tx2, tx3];
      const result = filterTransactions(
        input,
        filterByPayeeExact('PCC'),
        filterByPayeeExact("Trader Joe's"),
      );
      expect(result).toEqual([tx2, tx3]);
    });
  });
});

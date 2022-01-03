import { EnhancedTransaction, FileBlock,parse } from '../src/parser';
import { settingsWithDefaults } from '../src/settings';
import {
  filterByAccount,
  filterByPayeeExact,
  filterTransactions,
  formatTransaction,
  getCurrency,
  getTotal,
  makeAccountTree,
  Node,
  sortAccountTree,
} from '../src/transaction-utils';
import * as moment from 'moment';

window.moment = moment;

const emptyBlock: FileBlock = {
  firstLine: -1,
  lastLine: -1,
  block: '',
};

describe('formatting a transaction into ledger', () => {
  test('a transaction with a line comment and reconciliation symbol', () => {
    const contents = `2021-04-20 Obsidian
  ! e:Spending Money    $20.00    ; Inline comment
    ; line comment
    b:CreditUnion`;
    const txCache = parse(contents, settingsWithDefaults({}));
    expect(txCache.parsingErrors).toEqual([]);
    const output = formatTransaction(txCache.transactions[0], '$');
    expect(output).toEqual('\n' + contents);
  });
  test('a transaction with non-default currency', () => {
    const contents = `2021-04-20 Obsidian
  * e:Spending Money    €20.00
  ! b:CreditUnion`;
    const txCache = parse(contents, settingsWithDefaults({}));
    expect(txCache.parsingErrors).toEqual([]);
    const output = formatTransaction(txCache.transactions[0], '$');
    expect(output).toEqual('\n' + contents);
  });
  test('when the tx has the minimum allowed values', () => {
    const tx: EnhancedTransaction = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/31',
        payee: 'test-payee',
        expenselines: [
          {
            account: 'test-account-1',
            dealiasedAccount: 'test-account-1',
            amount: 10.0,
            currency: '$',
            reconcile: '',
          },
          {
            account: 'test-account-2',
            dealiasedAccount: 'test-account-2',
            amount: -10.0,
            currency: '$',
            reconcile: '',
          },
        ],
      },
    };

    const expected = [
      '',
      '2021/12/31 test-payee',
      '    test-account-1    $10.00',
      '    test-account-2',
    ].join('\n');

    const result = formatTransaction(tx, '$');
    expect(result).toEqual(expected);
  });
});

describe('getTotal()', () => {
  test('simple test', () => {
    const tx: EnhancedTransaction = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: '$',
            account: 'account1',
            dealiasedAccount: 'account1',
            reconcile: '',
          },
          {
            account: 'account2',
            dealiasedAccount: 'account2',
            amount: 20,
            reconcile: '',
          },
          {
            amount: -60,
            currency: '$',
            account: 'account3',
            dealiasedAccount: 'account3',
            reconcile: '',
          },
        ],
      },
    };
    const result = getTotal(tx, '$');
    expect(result).toEqual('$60.00');
  });
});

describe('getCurrency()', () => {
  test('When the first expense line has a currency', () => {
    const tx: EnhancedTransaction = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            currency: 'L',
            account: 'account1',
            dealiasedAccount: 'account1',
            reconcile: '',
          },
          {
            amount: -40,
            account: 'account3',
            dealiasedAccount: 'account3',
            reconcile: '',
          },
        ],
      },
    };
    const result = getCurrency(tx, '$');
    expect(result).toEqual('L');
  });
  test('When the second expense line has a currency', () => {
    const tx: EnhancedTransaction = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: -40,
            account: 'account1',
            dealiasedAccount: 'account1',
            reconcile: '',
          },
          {
            amount: 40,
            currency: 'L',
            account: 'account3',
            dealiasedAccount: 'account3',
            reconcile: '',
          },
        ],
      },
    };
    const result = getCurrency(tx, '$');
    expect(result).toEqual('L');
  });
  test('When the transaction does not specify a currency', () => {
    const tx: EnhancedTransaction = {
      type: 'tx',
      blockLine: -1,
      block: emptyBlock,
      value: {
        date: '2021/12/04',
        payee: 'Testing',
        expenselines: [
          {
            amount: 40,
            account: 'account1',
            dealiasedAccount: 'account1',
            reconcile: '',
          },
          {
            amount: -40,
            account: 'account3',
            dealiasedAccount: 'account3',
            reconcile: '',
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
  const tx1: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-12-31',
      payee: 'Costco',
      expenselines: [
        {
          account: 'e:Spending Money',
          dealiasedAccount: 'Expenses:Spending Money',
          amount: 100,
          currency: '$',
          reconcile: '',
        },
        {
          account: 'c:Citi',
          dealiasedAccount: 'Credit:City',
          amount: -100,
          reconcile: '',
        },
      ],
    },
  };
  const tx2: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-12-30',
      payee: "Trader Joe's",
      expenselines: [
        {
          account: 'e:Food:Grocery',
          dealiasedAccount: 'Expenses:Food:Grocery',
          amount: 120,
          currency: '$',
          reconcile: '',
        },
        {
          amount: -120,
          account: 'c:Citi',
          dealiasedAccount: 'Credit:City',
          reconcile: '',
        },
      ],
    },
  };
  const tx3: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-12-29',
      payee: 'PCC',
      expenselines: [
        {
          account: 'e:Food:Grocery',
          dealiasedAccount: 'Expenses:Food:Grocery',
          amount: 20,
          currency: '$',
          reconcile: '',
        },
        {
          amount: -20,
          account: 'c:Citi',
          dealiasedAccount: 'Credit:City',
          reconcile: '',
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

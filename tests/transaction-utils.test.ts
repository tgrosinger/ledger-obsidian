import { Transaction } from '../src/parser';
import {
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

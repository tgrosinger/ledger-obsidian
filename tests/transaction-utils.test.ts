import { Transaction } from '../src/parser';
import { getCurrency, getTotal } from '../src/transaction-utils';

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

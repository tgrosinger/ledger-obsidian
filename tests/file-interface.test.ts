import { formatExpense } from '../src/file-interface';
import { Transaction } from '../src/parser';
import { settingsWithDefaults } from '../src/settings';

describe('formatting a transaction into ledger', () => {
  test('when the tx has the minimum allowed values', () => {
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: '2021/12/31',
        payee: 'test-payee',
        expenselines: [
          {
            account: 'test-account-1',
            amount: 10.0,
            currency: '$',
          },
          {
            account: 'test-account-2',
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

    const result = formatExpense(tx, settingsWithDefaults({}));
    expect(result).toEqual(expected);
  });
});

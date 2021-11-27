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
            category: 'test-category-1',
            amount: 10.0,
            currency: '$',
          },
          {
            category: 'test-category-2',
          },
        ],
      },
    };

    const expected = [
      '',
      '2021/12/31 test-payee',
      '    test-category-1    $10.00',
      '    test-category-2',
    ].join('\n');

    const result = formatExpense(tx, settingsWithDefaults({}));
    expect(result).toEqual(expected);
  });
});

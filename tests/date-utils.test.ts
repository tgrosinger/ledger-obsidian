import { bucketTransactions, makeBucketNames } from '../src/date-utils';
import { EnhancedTransaction, FileBlock } from '../src/parser';
import * as moment from 'moment';

window.moment = moment;

const emptyBlock: FileBlock = {
  firstLine: -1,
  lastLine: -1,
  block: '',
};

describe('makeBucketNames()', () => {
  describe('week', () => {
    test('less than a week', () => {
      const result = makeBucketNames(
        'week',
        moment('2021-12-01'),
        moment('2021-12-03'),
      );
      expect(result).toEqual(['2021-12-01']);
    });
    test('exactly a week', () => {
      const result = makeBucketNames(
        'week',
        moment('2021-12-01'),
        moment('2021-12-07'),
      );
      expect(result).toEqual(['2021-12-01']);
    });
    test('exactly 8 days', () => {
      const result = makeBucketNames(
        'week',
        moment('2021-12-01'),
        moment('2021-12-08'),
      );
      expect(result).toEqual(['2021-12-01', '2021-12-08']);
    });
    test('longer', () => {
      const result = makeBucketNames(
        'week',
        moment('2021-11-01'),
        moment('2021-12-08'),
      );
      expect(result).toEqual([
        '2021-11-01',
        '2021-11-08',
        '2021-11-15',
        '2021-11-22',
        '2021-11-29',
        '2021-12-06',
      ]);
    });
  });
  describe('month', () => {
    test('less than a month', () => {
      const result = makeBucketNames(
        'month',
        moment('2021-12-01'),
        moment('2021-12-03'),
      );
      expect(result).toEqual(['2021-12-01']);
    });
    test('slightly over a month', () => {
      const result = makeBucketNames(
        'month',
        moment('2021-12-01'),
        moment('2022-01-01'),
      );
      expect(result).toEqual(['2021-12-01', '2022-01-01']);
    });
  });
});

describe('bucketTransaction()', () => {
  const tx1: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-12-31',
      payee: 'Costco',
      expenselines: [],
    },
  };
  const tx2: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-12-15',
      payee: "Trader Joe's",
      expenselines: [],
    },
  };
  const tx3: EnhancedTransaction = {
    type: 'tx',
    blockLine: -1,
    block: emptyBlock,
    value: {
      date: '2021-11-29',
      payee: 'PCC',
      expenselines: [],
    },
  };
  test('when there is only one bucket', () => {
    const result = bucketTransactions(['2021-11-15'], [tx1, tx2, tx3]);
    const entries = [...result.entries()];
    expect(entries).toEqual([[moment('2021-11-15'), [tx1, tx2, tx3]]]);
  });
  test('when a transaction is past the last bucket', () => {
    const result = bucketTransactions(
      ['2021-11-15', '2021-12-01'],
      [tx1, tx2, tx3],
    );
    const entries = [...result.entries()];
    expect(entries).toEqual([
      [moment('2021-11-15'), [tx3]],
      [moment('2021-12-01'), [tx1, tx2]],
    ]);
  });
  test('when there is a transaction exactly on a bucket date', () => {
    const result = bucketTransactions(
      ['2021-11-15', '2021-12-01', '2021-12-15'],
      [tx1, tx2, tx3],
    );
    const entries = [...result.entries()];
    expect(entries).toEqual([
      [moment('2021-11-15'), [tx3]],
      [moment('2021-12-01'), []],
      [moment('2021-12-15'), [tx1, tx2]],
    ]);
  });
  test('when there is a transaction right before a bucket date', () => {
    const result = bucketTransactions(
      ['2021-11-15', '2021-12-01', '2021-12-16'],
      [tx1, tx2, tx3],
    );
    const entries = [...result.entries()];
    expect(entries).toEqual([
      [moment('2021-11-15'), [tx3]],
      [moment('2021-12-01'), [tx2]],
      [moment('2021-12-16'), [tx1]],
    ]);
  });
});

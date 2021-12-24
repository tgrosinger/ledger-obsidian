import { Transaction } from './parser';
import { Moment } from 'moment';

export type Interval = 'day' | 'week' | 'month';

/**
 * makeBucketNames creates a list of dates at the provided interval between the
 * startDate and the endDate.
 */
export const makeBucketNames = (
  interval: Interval,
  startDate: Moment,
  endDate: Moment,
): string[] => {
  const names: string[] = [];
  const currentDate = startDate.clone();

  do {
    names.push(currentDate.format('YYYY-MM-DD'));
    currentDate.add(1, interval);
  } while (currentDate.isSameOrBefore(endDate));

  return names;
};

/**
 * bucketTransactions sorts the provided transactions into the appropriate
 * bucket name provided. Transactions will be put in the bucket whose name is
 * most closely the same or before the transaction date.
 *
 * Assumes that bucketNames are in chronological order from earliest to latest.
 */
export const bucketTransactions = (
  bucketNames: string[],
  txs: Transaction[],
): Map<Moment, Transaction[]> => {
  let firstBucketMoment: Moment;
  const restBucketMoments: Moment[] = [];
  const buckets = new Map<Moment, Transaction[]>();
  bucketNames.forEach((name, i) => {
    const m = window.moment(name);
    buckets.set(m, []);

    if (i === 0) {
      firstBucketMoment = m;
    } else {
      restBucketMoments.push(m);
    }
  });

  txs.forEach((tx) => {
    let prevBucket = firstBucketMoment;
    for (let i = 0; i < restBucketMoments.length; i++) {
      const m = window.moment(tx.value.date);
      if (m.isBefore(restBucketMoments[i])) {
        break;
      }
      prevBucket = restBucketMoments[i];
    }
    buckets.get(prevBucket).push(tx);
  });

  return buckets;
};

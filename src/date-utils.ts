import { getWithDefault } from './generic-utils';
import { EnhancedTransaction } from './parser';
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
  // TODO: We need to make sure the end of the range is captured. Right now it
  // seems there is either bug here or where we put data into the buckets which
  // is preventing all the transactions from being represented in the chart.

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
  txs: EnhancedTransaction[],
): Map<Moment, EnhancedTransaction[]> => {
  let firstBucketMoment: Moment;
  const restBucketMoments: Moment[] = [];
  const buckets = new Map<Moment, EnhancedTransaction[]>();
  bucketNames.forEach((name, i) => {
    const m = window.moment(name);
    buckets.set(m, []);

    if (i === 0) {
      firstBucketMoment = m;
    } else {
      restBucketMoments.push(m);
    }
  });

  const makeEmptyBucket = (): EnhancedTransaction[] => [];
  txs.forEach((tx) => {
    let prevBucket = firstBucketMoment;
    for (let i = 0; i < restBucketMoments.length; i++) {
      const m = window.moment(tx.value.date);
      if (m.isBefore(restBucketMoments[i])) {
        break;
      }
      prevBucket = restBucketMoments[i];
    }

    // getWithDefault is only necessary for the type checker here. We just put
    // this bucket in the map, so it will not be missing.
    getWithDefault(buckets, prevBucket, makeEmptyBucket).push(tx);
  });

  return buckets;
};

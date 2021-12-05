import type { TransactionCache } from '../parser';
import React from 'react';

export const AccountPage: React.FC<{
  accountName: string;
  txCache: TransactionCache;
}> = (props): JSX.Element => (
  <>
    <h2>Account Overview</h2>
    <p>Details for account {props.accountName}</p>
    <p>Not yet implemented</p>
  </>
);

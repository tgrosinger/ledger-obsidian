import { Transaction, TransactionCache } from '../parser';
import { WideInput } from './SharedStyles';
import { TextSuggest } from './TextSuggest';
import { App, Notice } from 'obsidian';
import React from 'react';
import styled from 'styled-components';

const Margin = styled.div`
  margin: 5px 0;
`;

const DatePicker = styled(WideInput)`
  background: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
  padding: 5px 14px;
  border-radius: 4px;
  height: 30px;
`;

const DatePickerMobile = styled(DatePicker)`
  display: block;
  padding: 8px 14px;
  height: auto;
  font-size: 17px;
`;

const InputWithIconWrapper = styled.div`
  position: relative;
`;

const InputWithIcon = styled(WideInput)`
  /* important required to override mobile stylesheet */
  padding-left: 25px !important;
`;

const InputIcon = styled.i`
  position: absolute;
  display: block;
  transform: translate(0, -50%);
  top: 50%;
  pointer-events: none;
  width: 25px;
  text-align: center;
  font-style: normal;
`;

export const CreateLedgerEntry: React.FC<{
  app: App;
  currencySymbol: string;
  saveFn: (tx: Transaction) => Promise<void>;
  txCache: TransactionCache;
  close: () => void;
}> = ({ app, currencySymbol, saveFn, txCache, close }): JSX.Element => {
  const [payee, setPayee] = React.useState('');
  const [total, setTotal] = React.useState(0);
  const [date, setDate] = React.useState('');
  const [expenseCategory, setExpenseCategory] = React.useState('');
  const [assetAccount, setAssetAccount] = React.useState('');

  const save = async (): Promise<void> => {
    if (payee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (date === '') {
      // TODO: Default to today
      new Notice('Must select a date');
      return;
    } else if (expenseCategory === '') {
      new Notice('Expense category must not be empty');
      return;
    } else if (assetAccount === '') {
      new Notice('Asset account must not be empty');
      return;
    }

    const formattedDate = date.replace(/-/g, '/');
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: formattedDate,
        payee,
        expenselines: [
          {
            category: expenseCategory,
            amount: total,
            currency: currencySymbol,
          },
          {
            category: assetAccount,
          },
        ],
      },
    };

    await saveFn(tx);
    close();
  };

  // TODO: Make this support income or transfers as well
  // TODO: Filter categories based on whether entering an expense, income, or transfer
  // TODO: Support splitting transactions
  return (
    <>
      <h2>Add to Ledger</h2>

      <Margin>
        {(app as any).isMobile ? (
          <DatePickerMobile
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : (
          <DatePicker
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
      </Margin>

      <Margin>
        <InputWithIconWrapper>
          <InputWithIcon
            placeholder="Amount"
            type="number"
            value={total}
            onChange={(e) => setTotal(parseFloat(e.target.value))}
          />
          <InputIcon>{currencySymbol}</InputIcon>
        </InputWithIconWrapper>
      </Margin>

      <Margin>
        <TextSuggest
          placeholder="Payee"
          suggestions={txCache.payees}
          value={payee}
          setValue={setPayee}
        />
      </Margin>

      <Margin>
        <TextSuggest
          placeholder="Expense Category"
          suggestions={txCache.categories}
          value={expenseCategory}
          setValue={setExpenseCategory}
        />
      </Margin>
      <Margin>
        <TextSuggest
          placeholder="Asset Account"
          suggestions={txCache.categories}
          value={assetAccount}
          setValue={setAssetAccount}
        />
      </Margin>

      <Margin>
        <button
          onClick={() => {
            save(); // async
          }}
        >
          Save
        </button>
      </Margin>
    </>
  );
};

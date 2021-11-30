import { Transaction, TransactionCache } from '../parser';
import { CurrencyInput } from './CurrencyInput';
import { WideInput } from './SharedStyles';
import { TextSuggest } from './TextSuggest';
import { Notice, Platform } from 'obsidian';
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

export const CreateLedgerEntry: React.FC<{
  currencySymbol: string;
  saveFn: (tx: Transaction) => Promise<void>;
  txCache: TransactionCache;
  close: () => void;
}> = ({ currencySymbol, saveFn, txCache, close }): JSX.Element => {
  const [payee, setPayee] = React.useState('');
  const [total, setTotal] = React.useState<string>('');
  const [date, setDate] = React.useState('');
  const [expenseCategory, setExpenseCategory] = React.useState('');
  const [assetAccount, setAssetAccount] = React.useState('');

  const suggestionCount = Platform.isMobile ? 5 : 15;

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
            amount: parseFloat(total),
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
        {Platform.isMobile ? (
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
        <CurrencyInput
          currencySymbol={currencySymbol}
          amount={total}
          setAmount={setTotal}
        />
      </Margin>

      <Margin>
        <TextSuggest
          placeholder="Payee (e.g. Obsidian.md)"
          displayCount={suggestionCount}
          suggestions={txCache.payees}
          value={payee}
          setValue={setPayee}
        />
      </Margin>

      <Margin>
        <TextSuggest
          placeholder="Expense Category"
          displayCount={suggestionCount}
          suggestions={txCache.categories}
          value={expenseCategory}
          setValue={setExpenseCategory}
        />
      </Margin>
      <Margin>
        <TextSuggest
          placeholder="Asset Account"
          displayCount={suggestionCount}
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

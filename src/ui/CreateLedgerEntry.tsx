import { Transaction, TransactionCache } from '../parser';
import { CurrencyInput } from './CurrencyInput';
import { WideInput, WideSelect } from './SharedStyles';
import { TextSuggest } from './TextSuggest';
import { union } from 'lodash';
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
  const [txType, setTxType] = React.useState('expense');
  const [total, setTotal] = React.useState<string>('');
  const [date, setDate] = React.useState('');

  const assetsAndLiabilities = union(
    txCache.assetCategories,
    txCache.liabilityCategories,
  );

  // TODO: Combine some related state into objects
  const [category1, setCategory1] = React.useState('');
  const [category1Suggestions, setCategory1Suggestions] = React.useState(
    txCache.expenseCategories,
  );
  const [category2, setCategory2] = React.useState('');
  const [category2Suggestions, setCategory2Suggestions] =
    React.useState(assetsAndLiabilities);

  const suggestionCount = Platform.isMobile ? 5 : 15;

  const getCategoryName = (c: 1 | 2): string => {
    switch (txType) {
      case 'expense':
        return c === 1 ? 'Expense' : 'Asset';
      case 'income':
        return c === 1 ? 'Asset' : 'Expense';
      case 'transfer':
        return c === 1 ? 'From' : 'To';
    }
  };

  const changeTxType = (newTxType: string): void => {
    switch (newTxType) {
      case 'expense':
        setCategory1Suggestions(txCache.expenseCategories);
        setCategory2Suggestions(assetsAndLiabilities);
        break;
      case 'income':
        setCategory1Suggestions(assetsAndLiabilities);
        setCategory2Suggestions(txCache.incomeCategories);
        break;
      case 'transfer':
        setCategory1Suggestions(assetsAndLiabilities);
        setCategory2Suggestions(assetsAndLiabilities);
        break;
    }

    setTxType(newTxType);
  };

  const save = async (): Promise<void> => {
    let localPayee = payee;
    if (txType === 'transfer') {
      const from = category1.split(':').last();
      const to = category2.split(':').last();
      localPayee = `${from} to ${to}`;
    }

    if (localPayee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (date === '') {
      // TODO: Default to today
      new Notice('Must select a date');
      return;
    } else if (category1 === '') {
      new Notice(`${getCategoryName(1)} account must not be empty`);
      return;
    } else if (category2 === '') {
      new Notice(`${getCategoryName(2)} account must not be empty`);
      return;
    }

    const formattedDate = date.replace(/-/g, '/');
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: formattedDate,
        payee: localPayee,
        expenselines: [
          {
            category: category1,
            amount: parseFloat(total),
            currency: currencySymbol,
          },
          {
            category: category2,
          },
        ],
      },
    };

    await saveFn(tx);
    close();
  };

  // TODO: Replace txType Select with nice buttons
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
        <WideSelect
          className="dropdown"
          onChange={(e) => {
            changeTxType(e.target.value);
          }}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </WideSelect>
      </Margin>

      <Margin>
        <CurrencyInput
          currencySymbol={currencySymbol}
          amount={total}
          setAmount={setTotal}
        />
      </Margin>

      {txType !== 'transfer' ? (
        <Margin>
          <TextSuggest
            placeholder="Payee (e.g. Obsidian.md)"
            displayCount={suggestionCount}
            suggestions={txCache.payees}
            value={payee}
            setValue={setPayee}
          />
        </Margin>
      ) : null}

      <Margin>
        <TextSuggest
          placeholder={`${getCategoryName(1)} Account`}
          displayCount={suggestionCount}
          suggestions={category1Suggestions}
          value={category1}
          setValue={setCategory1}
        />
      </Margin>
      <Margin>
        <TextSuggest
          placeholder={`${getCategoryName(2)} Account`}
          displayCount={suggestionCount}
          suggestions={category2Suggestions}
          value={category2}
          setValue={setCategory2}
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

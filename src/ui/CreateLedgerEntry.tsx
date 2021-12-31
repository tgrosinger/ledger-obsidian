import { LedgerModifier } from '../file-interface';
import { Operation } from '../modals';
import { Expenseline, Transaction, TransactionCache } from '../parser';
import { formatTransaction, getTotalAsNum } from '../transaction-utils';
import { CurrencyInput } from './CurrencyInput';
import { WideDatePicker, WideSelect } from './SharedStyles';
import { TextSuggest, TextSuggestInput } from './TextSuggest';
import { union } from 'lodash';
import { Notice, Platform } from 'obsidian';
import React from 'react';
import styled from 'styled-components';

const Margin = styled.div`
  margin: 5px 0;
`;

const DatePickerMobile = styled(WideDatePicker)`
  display: block;
  padding: 8px 14px;
  height: auto;
  font-size: 17px;
`;

const Warning = styled.div`
  background: var(--background-modifier-error);
  width: 458px;
  padding: 10px 15px;
`;

type TXType = 'expense' | 'income' | 'transfer' | 'unknown';

export const CreateLedgerEntry: React.FC<{
  displayFileWarning: boolean;
  currencySymbol: string;
  initialState: Transaction;
  operation: Operation;
  updater: LedgerModifier;
  txCache: TransactionCache;
  close: () => void;
}> = ({
  displayFileWarning,
  currencySymbol,
  initialState,
  operation,
  updater,
  txCache,
  close,
}): JSX.Element => {
  const isNew = operation === 'new';
  const [payee, setPayee] = React.useState(
    isNew ? '' : initialState.value.payee,
  );
  const [txType, setTxType] = React.useState(isNew ? 'expense' : 'unknown');
  const [total, setTotal] = React.useState<string>(
    isNew ? '' : getTotalAsNum(initialState).toString(),
  );
  const [date, setDate] = React.useState(
    isNew
      ? window.moment().format('YYYY-MM-DD')
      : window.moment(initialState.value.date).format('YYYY-MM-DD'),
  );

  const assetsAndLiabilities = union(
    txCache.assetAccounts,
    txCache.liabilityAccounts,
  );

  const [accounts, setAccounts] = React.useState<TextSuggestInput[]>(
    isNew
      ? [
          {
            value: '',
            suggestions: txCache.expenseAccounts,
          },
          {
            value: '',
            suggestions: assetsAndLiabilities,
          },
        ]
      : initialState.value.expenselines.map((line) => ({
          value: line.account,
          suggestions: txCache.accounts,
        })),
  );

  const suggestionCount = Platform.isMobile ? 5 : 15;

  const getAccountName = (i: number): string => {
    const lastI = accounts.length - 1;
    switch (txType) {
      case 'expense':
        return i !== lastI ? 'Expense' : 'Asset';
      case 'income':
        return i !== lastI ? 'Asset' : 'Expense';
      case 'transfer':
        return i !== lastI ? 'To' : 'From';
      case 'unknown':
        return '';
    }
  };

  const changeTxType = (newTxType: string): void => {
    setTxType(newTxType);
    const lastI = accounts.length - 1;
    setAccounts(
      accounts.map((account, i): TextSuggestInput => {
        switch (newTxType) {
          case 'expense':
            return {
              value: account.value,
              suggestions:
                i !== lastI ? txCache.expenseAccounts : assetsAndLiabilities,
            };
          case 'income':
            return {
              value: account.value,
              suggestions:
                i !== lastI ? assetsAndLiabilities : txCache.expenseAccounts,
            };
          case 'transfer':
            return {
              value: account.value,
              suggestions:
                i !== lastI ? assetsAndLiabilities : assetsAndLiabilities,
            };
          case 'unknown':
            return {
              value: account.value,
              suggestions: i !== lastI ? txCache.accounts : txCache.accounts,
            };
        }
      }),
    );
  };

  const makeUpdateAccount =
    (i: number): ((newValue: string) => void) =>
    (newValue: string): void => {
      setAccounts(
        accounts.map((account, j) => {
          if (j === i) {
            account.value = newValue;
          }
          return account;
        }),
      );
    };

  const save = async (): Promise<void> => {
    // TODO: Consider using Formik for better validation

    let localPayee = payee;
    if (txType === 'transfer') {
      const to = accounts[0].value.split(':').last();
      const from = accounts[1].value.split(':').last();
      localPayee = `${from} to ${to}`;
    }

    if (localPayee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (date === '') {
      new Notice('Must select a date');
      return;
    } else if (total === '' || Number.isNaN(parseFloat(total))) {
      new Notice('Must specify an amount');
      return;
    } else if (accounts.find(({ value }) => value === '')) {
      new Notice('Transaction accounts must not be empty');
      return;
    }

    const lastI = accounts.length - 1;
    const expenseLines = accounts.map((account, i): Expenseline => {
      if (i === lastI) {
        return {
          account: account.value,
        };
      }

      return {
        account: account.value,
        amount: parseFloat(total),
        currency: currencySymbol,
      };
    });

    // TODO: This is not a ISO8601. Once reconciliation is added, remove this and reformat file.
    const formattedDate = date.replace(/-/g, '/');
    const tx: Transaction = {
      type: 'tx',
      value: {
        date: formattedDate,
        payee: localPayee,
        expenselines: expenseLines,
      },
    };

    const txStr = formatTransaction(tx, currencySymbol);
    switch (operation) {
      case 'new':
      case 'clone':
        await updater.appendLedger(txStr);
        break;
      case 'modify':
        await updater.updateTransaction(initialState, txStr);
        break;
    }

    close();
  };

  // TODO: Replace txType Select with nice buttons
  // TODO: Support adding comments
  // TODO: Support splitting transactions
  return (
    <>
      <h2>Add to Ledger</h2>

      {displayFileWarning ? (
        <Warning>
          Please rename your ledger file to end with the .ledger extension. Once
          renamed, please update the configuration option in the Ledger plugin
          settings.
        </Warning>
      ) : null}

      <Margin>
        {Platform.isMobile ? (
          <DatePickerMobile
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : (
          <WideDatePicker
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
            input={{
              value: payee,
              suggestions: txCache.payees,
            }}
            setValue={setPayee}
          />
        </Margin>
      ) : null}

      <Margin>
        <TextSuggest
          placeholder={`${getAccountName(0)} Account`}
          displayCount={suggestionCount}
          input={accounts[0]}
          setValue={makeUpdateAccount(0)}
        />
      </Margin>
      <Margin>
        <TextSuggest
          placeholder={`${getAccountName(1)} Account`}
          displayCount={suggestionCount}
          input={accounts[1]}
          setValue={makeUpdateAccount(1)}
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

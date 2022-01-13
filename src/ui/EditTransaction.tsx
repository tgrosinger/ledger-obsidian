import { LedgerModifier } from '../file-interface';
import { Operation } from '../modals';
import {
  EnhancedExpenseLine,
  EnhancedTransaction,
  TransactionCache,
} from '../parser';
import { formatTransaction, getTotalAsNum } from '../transaction-utils';
import { CurrencyInputFormik } from './CurrencyInput';
import { TextSuggest } from './TextSuggest';
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldProps,
  Form,
  Formik,
  FormikProps,
} from 'formik';
import { union } from 'lodash';
import { err, ok, Result } from 'neverthrow';
import React from 'react';
import styled from 'styled-components';

const ButtonGroupStyle = styled.div`
  display: flex;

  .button {
    background: var(--background-secondary-alt);
    color: var(--text-normal);
    cursor: pointer;
    text-align: center;
    margin-left: 0;
    margin-right: 0;
    flex-grow: 1;
    flex-basis: 1;
  }

  .button:first-child {
    border-radius: 4px 0 0 4px;
  }

  .button:last-child {
    border-radius: 0 4px 4px 0;
  }

  .button:only-child {
    border-radius: 4px;
  }

  .selected {
    background: var(--interactive-accent) !important;
    color: var(--text-on-accent);
  }
`;

const ButtonGroup: React.FC<
  {
    options: [string, string][];
  } & FieldProps<string, Values>
> = (props): JSX.Element => (
  <ButtonGroupStyle>
    {props.options.map((option) => (
      <div
        key={option[0]}
        className={
          (props.field.value === option[0] ? 'selected ' : '') + 'button'
        }
        onClick={() => {
          props.form.setFieldValue(props.field.name, option[0]);
        }}
      >
        {option[1]}
      </div>
    ))}
  </ButtonGroupStyle>
);

/**
 * calcPlaceholderExpenseLineAmount determines the amount that must be assigned
 * to each expense line that does not yet have a value in order for the sum of
 * the expense lines to balance.
 */
const calcPlaceholderExpenseLineAmount = (
  values: Values,
): Result<string, string> => {
  const linesExceptLast = values.lines.slice(0, -1);
  const numEmptyLines = linesExceptLast.filter(
    (line) => line.amount === '',
  ).length;
  const unassignedTotal = linesExceptLast.reduce(
    (amount, line) =>
      line.amount === '' ? amount : amount - parseFloat(line.amount),
    parseFloat(values.total),
  );
  if (numEmptyLines === 0 && unassignedTotal !== 0) {
    return err(
      'All expense lines assigned, however amounts do not balance to 0',
    );
  }
  return ok((unassignedTotal / numEmptyLines).toFixed(2));
};

const ExpenseLineStyle = styled.div`
  .arrow {
    width: 0;
    height: 0;
    position: relative;
    top: 4px;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-left: 10px solid var(--text-muted);
    margin-right: 8px;

    flex-shrink: 1;
    cursor: pointer;
  }

  .arrow.rotateDown {
    transform: rotate(90deg);
  }

  .arrowPlaceholder {
    padding-left: 23px;
    flex-shrink: 1;
  }

  .removeLine {
    flex-shrink: 1;
    margin: 7px 7px 4px 1px;
    fill: var(--text-muted);
    cursor: pointer;
  }

  .currencyInput {
    flex-basis: 200px;
    flex-shrink: 1;
  }

  .drawer {
    display: none;
  }

  .drawer.expanded {
    display: flex;
  }
`;

const ExpenseLine: React.FC<{
  i: number;
  line: Line;
  formik: FormikProps<Values>;
  remove: (index: number) => undefined;
  txCache: TransactionCache;
  currencySymbol: string;
}> = ({ i, formik, ...props }): JSX.Element => {
  const lines = formik.values.lines;

  const getAccountName = (): string => {
    const lastI = lines.length - 1;
    switch (formik.values.txType) {
      case 'expense':
        return i !== lastI ? 'Expense' : 'Asset';
      case 'income':
        return i !== lastI ? 'Asset' : 'Expense';
      case 'transfer':
        return i !== lastI ? 'To' : 'From';
    }
    return '';
  };

  const assetsAndLiabilities = union(
    props.txCache.assetAccounts,
    props.txCache.liabilityAccounts,
  );

  const getSuggestions = (): string[] => {
    const lastI = lines.length - 1;
    switch (formik.values.txType) {
      case 'expense':
        return i !== lastI
          ? props.txCache.expenseAccounts
          : assetsAndLiabilities;
      case 'income':
        return i !== lastI
          ? assetsAndLiabilities
          : props.txCache.expenseAccounts;
      case 'transfer':
        return assetsAndLiabilities;
    }
    return props.txCache.accounts;
  };

  const [expanded, setExpanded] = React.useState(false);

  return (
    <ExpenseLineStyle>
      <Margin className="flexRow">
        <div
          className={'arrow' + (expanded ? ' rotateDown' : '')}
          onClick={() => setExpanded(!expanded)}
        />
        <Field
          className="flexGrow"
          component={TextSuggest}
          name={`lines.${i}.account`}
          placeholder={getAccountName() + ' Account'}
          suggestions={getSuggestions()}
        />
        {i + 1 !== lines.length ? (
          <Field
            className="currencyInput"
            component={CurrencyInputFormik}
            placeholder={calcPlaceholderExpenseLineAmount(
              formik.values,
            ).unwrapOr('Error')}
            currencySymbol={props.currencySymbol}
            name={`lines.${i}.amount`}
          />
        ) : (
          <Field
            className="currencyInput"
            component={CurrencyInputFormik}
            currencySymbol={props.currencySymbol}
            name={`lines.${i}.amount`}
            disabled={i + 1 === lines.length}
          />
        )}
      </Margin>
      <div className={'drawer' + (expanded ? ' expanded' : '')}>
        {i !== 0 && i !== lines.length - 1 ? (
          <svg
            className="removeLine"
            onClick={() => props.remove(i)}
            width="16"
            height="16"
            version="1.1"
            viewBox="0 0 28 28"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="m6.6465 5.2324-1.4141 1.4141 7.3535 7.3535-7.3535 7.3535 1.4141 1.4141 7.3535-7.3535 7.3535 7.3535 1.4141-1.4141-7.3535-7.3535 7.3535-7.3535-1.4141-1.4141-7.3535 7.3535-7.3535-7.3535z" />
          </svg>
        ) : (
          <div className="arrowPlaceholder" />
        )}
        <Field
          className="flexGrow"
          type="text"
          name={`lines.${i}.comment`}
          placeholder="Memo"
        />
      </div>
    </ExpenseLineStyle>
  );
};

const Margin = styled.div`
  margin: 5px;
`;

const Warning = styled.div`
  background: var(--background-modifier-error);
  width: 458px;
  padding: 10px 15px;
`;

const FormStyles = styled.div`
  .flexRow {
    display: flex;
  }

  .flexGrow {
    flex-grow: 1;
    /* Not sure why this needs to be a percentage */
    flex-basis: 40%;
  }

  .flexShrink {
    flex-shrink 1;
  }

  input {
    width: 100%;
  }
`;

/**
 * Line is analagous to EnhancedExpenseLine, however the types are slightly
 * different to facilitate with use in the form.
 */
interface Line {
  id: number;
  account: string;
  amount: string;
  comment: string;
  reconcile: '' | '*' | '!';
  currency?: string;
}

const lineToEnhancedExpenseLine = (line: Line): EnhancedExpenseLine => ({
  account: line.account,
  dealiasedAccount: line.account,
  amount: parseFloat(line.amount),
  reconcile: line.reconcile,
  comment: line.comment || undefined,
  currency: line.currency,
});

export interface Values {
  payee: string;
  txType: string;
  date: string;
  total: string;
  lines: Line[];
}

interface ValueErrors {
  payee?: string;
  date?: string;
  total?: string;
  lines?: string;
}

export const EditTransaction: React.FC<{
  displayFileWarning: boolean;
  currencySymbol: string;
  initialState: EnhancedTransaction;
  operation: Operation;
  updater: LedgerModifier;
  txCache: TransactionCache;
  close: () => void;
}> = (props): JSX.Element => {
  const isNew = props.operation === 'new';
  const [page, setPage] = React.useState(1);

  const initialValues: Values = {
    payee: isNew ? '' : props.initialState.value.payee,
    txType: isNew ? 'expense' : 'unknown',
    date: isNew
      ? window.moment().format('YYYY-MM-DD')
      : window.moment(props.initialState.value.date).format('YYYY-MM-DD'),
    total: isNew ? '' : getTotalAsNum(props.initialState).toString(),
    lines: isNew
      ? [
          {
            id: 0,
            account: '',
            amount: '',
            comment: '',
            reconcile: '',
          },
          {
            id: 1,
            account: '',
            amount: '',
            comment: '',
            reconcile: '',
          },
        ]
      : props.initialState.value.expenselines
          .filter((line): line is EnhancedExpenseLine => 'account' in line)
          .map(
            (line, i): Line => ({
              id: i,
              account: line.account,
              amount: line.amount.toFixed(2),
              comment: line.comment || '',
              reconcile: line.reconcile,
              currency: line.currency,
            }),
          ),
  };

  return (
    <FormStyles>
      <h2>Add to Ledger</h2>

      {props.displayFileWarning ? (
        <Warning>
          Please rename your ledger file to end with the .ledger extension. Once
          renamed, please update the configuration option in the Ledger plugin
          settings.
        </Warning>
      ) : null}

      <Formik
        initialValues={initialValues}
        validateOnChange={false}
        validate={(values) => {
          const errors: ValueErrors = {};

          if (values.date === '') {
            errors.date = 'Required';
          }
          if (values.total === '') {
            errors.total = 'Required';
          } else if (Number.isNaN(parseFloat(values.total))) {
            errors.total = 'Total must be a number';
          }
          if (values.txType !== 'transfer' && values.payee === '') {
            errors.payee = 'Required';
          }

          if (values.lines.some((line) => line.account === '')) {
            errors.lines = 'All expense lines must specify an account';
          }

          if (values.lines.filter((line) => line.amount === '').length === 0) {
            // Validate that the amounts all add to zero
            const sum = values.lines.reduce(
              (acc, line) => parseFloat(line.amount) + acc,
              0,
            );
            if (sum !== 0) {
              errors.lines = `Amounts add up to $${sum.toFixed(
                2,
              )} but must add up to $0`;
            }
          }

          return errors;
        }}
        onSubmit={(values) => {
          if (values.lines.filter((line) => line.amount === '').length > 0) {
            // Fill missing values in the expense lines
            calcPlaceholderExpenseLineAmount(values).map((amount) => {
              values.lines.forEach((line) => {
                if (line.amount === '') {
                  line.amount = amount;
                }
              });
            });
          }

          let localPayee = values.payee;
          if (values.txType === 'transfer') {
            const accountNames = values.lines.map((line) =>
              line.account.split(':').last(),
            );
            const to = accountNames.slice(0, -1).join(' and ');
            const from = accountNames.last();
            localPayee = `${from} to ${to}`;
          }

          // This tx is not fully valid because we are not specifying a valid block.
          // It's only complete enough that we can format it into a string.
          const newTx: EnhancedTransaction = {
            blockLine: -1,
            block: {
              firstLine: -1,
              lastLine: -1,
              block: '',
            },
            type: 'tx',
            value: {
              payee: localPayee,
              // TODO: This is not a ISO8601. Once reconciliation is added, remove this and reformat file.
              date: values.date.replace(/-/g, '/'),
              expenselines: values.lines.map((line) =>
                lineToEnhancedExpenseLine(line),
              ),
              check: props.initialState.value.check,
              comment: props.initialState.value.comment,
            },
          };

          const txStr = formatTransaction(newTx, props.currencySymbol);

          switch (props.operation) {
            case 'new':
            case 'clone':
              props.updater.appendLedger(txStr).then(props.close);
              break;
            case 'modify':
              props.updater
                .updateTransaction(props.initialState, txStr)
                .then(props.close);
              break;
          }
        }}
      >
        {(formik) => (
          <Form>
            {page === 1 ? (
              <>
                <Margin>
                  <Field
                    name="txType"
                    component={ButtonGroup}
                    options={[
                      ['expense', 'Expense'],
                      ['income', 'Income'],
                      ['transfer', 'Transfer'],
                    ]}
                  />
                </Margin>
                <div className="flexRow">
                  <Margin className="flexGrow">
                    <Field
                      component={CurrencyInputFormik}
                      currencySymbol={props.currencySymbol}
                      name="total"
                      placeholder="Total Amount"
                    />
                    <ErrorMessage name="total" component="div" />
                  </Margin>
                  <Margin className="flexShrink">on</Margin>
                  <Margin className="flexGrow">
                    <Field type="date" name="date" />
                    <ErrorMessage name="date" component="div" />
                  </Margin>
                </div>
                {formik.values.txType !== 'transfer' && (
                  <Margin>
                    <Field
                      component={TextSuggest}
                      name="payee"
                      placeholder="Payee (e.g. Obsidian.md)"
                      suggestions={props.txCache.payees}
                    />
                    <ErrorMessage name="payee" component="div" />
                  </Margin>
                )}
              </>
            ) : (
              <div className="expenseLines">
                <FieldArray name="lines">
                  {({ insert, remove }) => (
                    <>
                      {formik.values.lines.map((line, i) => (
                        <ExpenseLine
                          key={line.id}
                          line={line}
                          formik={formik}
                          i={i}
                          remove={remove}
                          txCache={props.txCache}
                          currencySymbol={props.currencySymbol}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const prevMaxID = formik.values.lines.reduce(
                            (max, line) => Math.max(max, line.id),
                            -1,
                          );
                          const newLine: Line = {
                            id: prevMaxID + 1,
                            account: '',
                            amount: '',
                            comment: '',
                            reconcile: '',
                          };
                          insert(formik.values.lines.length - 1, newLine);
                        }}
                      >
                        Add Split
                      </button>
                    </>
                  )}
                </FieldArray>
                <ErrorMessage name="lines" component="div" />
              </div>
            )}

            <Margin>
              {page === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    let hadError = false;
                    if (formik.values.total === '') {
                      formik.setFieldTouched('total', true, true);
                      formik.validateForm();
                      hadError = true;
                    }

                    if (
                      formik.values.txType !== 'transfer' &&
                      formik.values.payee === ''
                    ) {
                      formik.setFieldTouched('payee', true, true);
                      formik.validateForm();
                      hadError = true;
                    }

                    if (!hadError) {
                      // The final expense line should be set to the opposite of the total
                      const lastI = formik.values.lines.length - 1;
                      const inverse = -1 * parseFloat(formik.values.total);
                      formik.values.lines[lastI].amount = inverse.toFixed(2);
                      setPage(page + 1);
                    }
                  }}
                >
                  Next
                </button>
              )}
              {page === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPage(page - 1);
                    }}
                  >
                    Back
                  </button>
                  <button type="submit" disabled={formik.isSubmitting}>
                    Submit
                  </button>
                </>
              )}
            </Margin>
          </Form>
        )}
      </Formik>
    </FormStyles>
  );
};

<script lang="ts">
  import { Notice } from 'obsidian';
  import TextSuggest from './TextSuggest.svelte';
  import { Calendar } from 'obsidian-calendar-ui';
  import ExpenseLinesInput from './ExpenseLinesInput.svelte';
  import { max } from 'lodash';

  import type { TransactionCache, Expenseline, Transaction } from '../parser';
  import type { Moment } from 'moment';

  export let currencySymbol: string;
  export let txCache: TransactionCache;
  export let saveFn: (tx: Transaction) => Promise<void>;
  export let close: () => void;

  let today = window.moment();
  let selectedDay: string;
  let payee: string;
  let lines: Expenseline[] = [
    {
      category: '',
      amount: 0,
      id: 1,
      currency: currencySymbol,
      reconcile: '',
      comment: undefined,
    },
    {
      category: '',
      amount: 0,
      id: 2,
      currency: currencySymbol,
      reconcile: '',
      comment: undefined,
    },
  ];

  const selectDay = (date: Moment): void => {
    selectedDay = `day-` + date.startOf('day').format();
  };

  selectDay(window.moment().clone());

  const save = async () => {
    const dateMatches = /[\d]{4}-[\d]{2}-[\d]{2}/.exec(selectedDay);
    if (!dateMatches || dateMatches.length !== 1) {
      new Notice('Unable to determine selected date');
      console.error('ledger: Unable to process selected date: ' + selectedDay);
      return;
    }
    const date = dateMatches[0].replace(/-/g, '/');

    if (!payee || payee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (lines.some(({ category }) => category === '')) {
      new Notice('Transaction lines must have a category');
      return;
    }

    const tx: Transaction = {
      type: 'tx',
      value: {
        check: undefined,
        date,
        payee,
        expenselines: lines,
      },
    };

    await saveFn(tx);
    close();
  };
</script>

<h2>Add to Ledger</h2>

<div class="ledger-add-expense-form">
  <Calendar
    {today}
    onClickDay={selectDay}
    bind:selectedId={selectedDay}
    showWeekNums={false}
  />
  <div class="form-row">
    <TextSuggest
      bind:value={payee}
      placeholder="Payee"
      suggestions={txCache.payees}
      classes="expense-payee"
    />
  </div>

  <ExpenseLinesInput {currencySymbol} {txCache} {lines} />

  <!-- TODO: Move total row back here -->

  <button on:click={save}> Save </button>
</div>

<style>
  .form-row {
    padding: 5px 0;
    display: flex;
  }
</style>

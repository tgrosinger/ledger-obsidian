<script lang="ts">
  import { Notice } from 'obsidian';
  import TextSuggest from './TextSuggest.svelte';
  import { Calendar } from 'obsidian-calendar-ui';
  import { max } from 'lodash';

  import type { ExpenseLine } from '../file-interface';
  import type { TransactionCache } from '../parser';
  import type { Moment } from 'moment';

  export let currencySymbol: string;
  export let txCache: TransactionCache;
  export let saveFn: (
    date: string,
    payee: string,
    lines: ExpenseLine[],
  ) => Promise<void>;
  export let close: () => void;

  let today = window.moment();
  let selectedDay: string;
  let payee: string;
  let lines: ExpenseLine[] = [
    { category: '', amount: 0, id: 1 },
    { category: '', amount: 0, id: 2 },
  ];

  $: remainder = (
    -1 *
    lines.map(({ amount }) => amount).reduce((prev, curr) => curr + prev, 0)
  ).toFixed(2);

  const addRow = (): void => {
    lines.splice(lines.length - 1, 0, {
      category: '',
      amount: 0.0,
      id: max(lines.map((line) => line.id)) + 1,
    });
    lines = lines; // Svelte reactivity hack
  };

  const removeRow = (id: number): void => {
    lines = lines.filter((line) => line.id !== id);
  };

  const formatAmount = (event: FocusEvent): void => {
    const target = event.target as HTMLInputElement;
    target.value = target.valueAsNumber.toFixed(2);
  };

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

    await saveFn(date, payee, lines);
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
  <div class="ledger-form-row">
    <TextSuggest
      bind:value={payee}
      placeholder="Payee"
      suggestions={txCache.payees}
      classes="ledger-expense-payee"
    />
  </div>

  {#each lines as line, i (line.id)}
    <div class="ledger-form-row">
      {#if i > 0 && i !== lines.length - 1}
        <svg
          class="ledger-remove-row"
          on:click={() => {
            removeRow(line.id);
          }}
          viewBox="0 0 100 100"
          width="16"
          height="16"
          ><path
            fill="currentColor"
            stroke="currentColor"
            d="M18,8C12.5,8,8,12.5,8,18v64c0,5.5,4.5,10,10,10h64c5.5,0,10-4.5,10-10V18c0-5.5-4.5-10-10-10L18,8z M18,12h64 c3.3,0,6,2.7,6,6v64c0,3.3-2.7,6-6,6H18c-3.3,0-6-2.7-6-6V18C12,14.7,14.7,12,18,12z M33.4,30.6l-2.8,2.8L47.2,50L30.6,66.6 l2.8,2.8L50,52.8l16.6,16.6l2.8-2.8L52.8,50l16.6-16.6l-2.8-2.8L50,47.2L33.4,30.6z"
          /></svg
        >
      {/if}
      <TextSuggest
        placeholder="Account"
        bind:value={line.category}
        classes="ledger-expense-category"
        suggestions={txCache.categories}
      />
      <div class="input-icon">
        {#if i === lines.length - 1}
          <input
            class="ledger-expense-amount"
            type="number"
            placeholder="Amount"
            disabled={true}
            value={remainder}
          />
        {:else}
          <input
            class="ledger-expense-amount"
            type="number"
            placeholder="Amount"
            on:blur={formatAmount}
            bind:value={line.amount}
          />
        {/if}
        <i>{currencySymbol}</i>
      </div>
    </div>
  {/each}

  <button id="ledger-add-row" on:click={addRow}> Add Row </button>
  <button id="ledger-save-expense" on:click={save}> Save </button>
</div>

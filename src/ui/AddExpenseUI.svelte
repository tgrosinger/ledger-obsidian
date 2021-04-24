<script lang="ts">
  import { Notice } from 'obsidian';
  import { StaticSuggest } from './suggest';
  import { Calendar } from 'obsidian-calendar-ui';
  import { onMount } from 'svelte';
  import { flatMap, max, sortedUniq } from 'lodash';

  import type { ExpenseLine, Transaction } from '../file-interface';
  import type { Moment } from 'moment';

  export let currencySymbol: string;
  export let txCache: Transaction[];
  export let saveFn: (
    date: string,
    payee: string,
    lines: ExpenseLine[],
  ) => Promise<void>;
  export let close: () => void;

  interface ExpenseLineInput {
    categoryEl: HTMLInputElement | undefined;
    amount: number;
    id: number;
  }

  const categories = sortedUniq(
    flatMap(txCache, ({ lines }) =>
      lines.map(({ category }) => category),
    ).sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)),
  );

  let today = window.moment();
  let selectedDay: string;
  let payee: string;
  let lines: ExpenseLineInput[] = [1, 2].map(
    (id): ExpenseLineInput => {
      return { categoryEl: undefined, amount: 0.0, id: id };
    },
  );

  const payees = txCache.map(({ payee }) => payee);
  let payeeInputEl: HTMLInputElement;

  $: remainder = (
    -1 *
    lines.map(({ amount }) => amount).reduce((prev, curr) => curr + prev, 0)
  ).toFixed(2);

  const addRow = (): void => {
    console.log('Adding new row');
    // TODO: Not sure how to add the StaticSuggest here
    const nextID = max(lines.map(({ id }) => id)) + 1;
    lines.splice(lines.length - 1, 0, {
      categoryEl: undefined,
      amount: 0.0,
      id: nextID,
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
    console.log(selectedDay);
  };

  selectDay(window.moment().clone());

  const save = async () => {
    const dateMatches = /[\d]{4}-[\d]{2}-[\d]{2}/.exec(selectedDay);
    if (!dateMatches || dateMatches.length !== 1) {
      new Notice('Unable to determine selected date');
      console.error('Unalbe to process selected date: ' + selectedDay);
      return;
    }
    const date = dateMatches[0].replace(/-/g, '/');

    if (!payee || payee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (lines.some(({ categoryEl }) => categoryEl.value === '')) {
      new Notice('Transaction lines must have a category');
      return;
    }

    const expenseLines = lines.map(
      (line): ExpenseLine => {
        return {
          category: line.categoryEl.value,
          amount: line.amount,
        };
      },
    );

    await saveFn(date, payee, expenseLines);
    close();
  };

  onMount(() => {
    new StaticSuggest(window.app, payeeInputEl, payees);

    lines.forEach(({ categoryEl }) => {
      new StaticSuggest(window.app, categoryEl, categories);
    });
  });
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
    <input
      id="ledger-expense-payee"
      type="text"
      bind:this={payeeInputEl}
      bind:value={payee}
      placeholder="Payee"
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
      <input
        class="ledger-expense-category"
        type="text"
        placeholder="Account"
        bind:this={line.categoryEl}
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

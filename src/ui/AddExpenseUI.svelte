<script lang="ts">
  import { Notice } from 'obsidian';
  import { StaticSuggest } from './suggest';
  import { Calendar } from 'obsidian-calendar-ui';
  import { onMount } from 'svelte';
  import { flatMap, sortedUniq } from 'lodash';

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
    (): ExpenseLineInput => {
      return { categoryEl: undefined, amount: 0.0 };
    },
  );

  const payees = txCache.map(({ payee }) => payee);
  let payeeInputEl: HTMLInputElement;

  $: remainder = (
    -1 *
    lines.map(({ amount }) => amount).reduce((prev, curr) => curr + prev, 0)
  ).toFixed(2);

  const addRow = (): void => {
    // TODO: Not sure how to add the StaticSuggest here
    lines.splice(lines.length - 1, 0, { categoryEl: undefined, amount: 0.0 });
    lines = lines; // Svelte reactivity hack
  };

  const removeRow = (i: number): void => {
    lines.splice(i, 1);
    lines = lines; // Svelte reactivity hack
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

<h1>Add to Ledger</h1>

<div class="ledger-add-expense-form">
  <div class="ledger-form-row">
    <Calendar
      {today}
      onClickDay={selectDay}
      bind:selectedId={selectedDay}
      showWeekNums={false}
    />
    <input
      id="ledger-expense-name"
      type="text"
      bind:this={payeeInputEl}
      bind:value={payee}
      placeholder="Payee"
    />
  </div>

  <!-- TODO: Add an ID to key off for the each -->
  {#each lines as line, i}
    <div class="ledger-form-row">
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
      {#if i > 0 && i !== lines.length - 1}
        <button
          class="ledger-expense-remove-row"
          on:click={() => {
            removeRow(i);
          }}>-</button
        >
      {/if}
    </div>
  {/each}

  <button id="ledger-add-row" on:click={addRow}> Add Row </button>
  <button id="ledger-save-expense" on:click={save}> Save </button>
</div>

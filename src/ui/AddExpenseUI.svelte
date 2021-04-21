<script lang="ts">
  import { Notice } from 'obsidian';

  import type { ExpenseLine, Transaction } from '../file-interface';

  export let currencySymbol: string;
  export let txCache: Transaction[];
  export let saveFn: (
    date: string,
    payee: string,
    lines: ExpenseLine[],
  ) => Promise<void>;
  export let close: () => void;

  let date: string;
  let payee: string;
  let lines: ExpenseLine[] = [
    { category: '', amount: 0.0 },
    { category: '', amount: 0.0 },
  ];

  $: remainder = (
    -1 *
    lines.map(({ amount }) => amount).reduce((prev, curr) => curr + prev, 0)
  ).toFixed(2);

  const addRow = (): void => {
    lines.splice(lines.length - 1, 0, { category: '', amount: 0.0 });
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

  const save = async () => {
    if (!payee || payee === '') {
      new Notice('Payee must not be empty');
      return;
    } else if (!date || date === '') {
      new Notice('Date must not be empty');
      return;
    } else if (lines.some(({ category }) => category === '')) {
      new Notice('Transaction lines must have a category');
      return;
    }

    await saveFn(date, payee, lines);
    close();
  };
</script>

<h1>Add to Ledger</h1>

<div class="ledger-add-expense-form">
  <div class="ledger-form-row">
    <input id="ledger-expense-date" type="date" bind:value={date} />
    <input
      id="ledger-expense-name"
      type="text"
      bind:value={payee}
      placeholder="Payee"
    />
  </div>

  {#each lines as line, i}
    <div class="ledger-form-row">
      <input
        id="ledger-expense-line-category-{i}"
        type="text"
        placeholder="Account"
        bind:value={line.category}
      />
      <div class="input-icon">
        {#if i === lines.length - 1}
          <input
            id="ledger-expense-line-amount-{i}"
            type="number"
            placeholder="Amount"
            disabled={true}
            value={remainder}
          />
        {:else}
          <input
            id="ledger-expense-line-amount-{i}"
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

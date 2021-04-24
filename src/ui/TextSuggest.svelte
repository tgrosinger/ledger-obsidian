<script lang="ts">
  import { onMount } from 'svelte';
  import { StaticSuggest } from './suggest';

  export let suggestions: string[];
  export let placeholder: string;
  export let value: string;
  export let classes: string;

  let inputEl: HTMLInputElement;

  onMount(() => {
    new StaticSuggest(window.app, inputEl, suggestions);
  });
</script>

<input
  class={classes}
  type="text"
  {placeholder}
  bind:this={inputEl}
  bind:value
/>

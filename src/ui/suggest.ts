import { createPopper, Instance as PopperInstance } from '@popperjs/core';
import { App, ISuggestOwner, Scope } from 'obsidian';

export const wrapAround = (value: number, size: number): number =>
  ((value % size) + size) % size;

/**
 * Reproduced with permission from
 * https://github.com/liamcain/obsidian-periodic-notes/blob/10fa35874d92750508967d4f1e58b3fa0eb87996/src/ui/suggest.ts
 * Author: Liam Cain
 */
class Suggest<T> {
  private readonly owner: ISuggestOwner<T>;
  private values: T[];
  private suggestions: HTMLDivElement[];
  private selectedItem: number;
  private readonly containerEl: HTMLElement;

  constructor(owner: ISuggestOwner<T>, containerEl: HTMLElement, scope: Scope) {
    this.owner = owner;
    this.containerEl = containerEl;

    containerEl.on('click', '.suggestion-item', this.onSuggestionClick);
    containerEl.on('mousemove', '.suggestion-item', this.onSuggestionMouseover);

    scope.register([], 'ArrowUp', (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem - 1, true);
        return false;
      }
    });

    scope.register([], 'ArrowDown', (event) => {
      if (!event.isComposing) {
        this.setSelectedItem(this.selectedItem + 1, true);
        return false;
      }
    });

    scope.register([], 'Enter', (event) => {
      if (!event.isComposing) {
        this.useSelectedItem(event);
        return false;
      }
    });
  }

  public setSuggestions(values: T[]): void {
    this.containerEl.empty();
    const suggestionEls: HTMLDivElement[] = [];

    values.forEach((value) => {
      const suggestionEl = this.containerEl.createDiv('suggestion-item');
      this.owner.renderSuggestion(value, suggestionEl);
      suggestionEls.push(suggestionEl);
    });

    this.values = values;
    this.suggestions = suggestionEls;
    this.setSelectedItem(0, false);
  }

  private readonly onSuggestionClick = (event: MouseEvent, el: HTMLDivElement): void => {
    event.preventDefault();

    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
    this.useSelectedItem(event);
  };

  private readonly onSuggestionMouseover = (
    _event: MouseEvent,
    el: HTMLDivElement,
  ): void => {
    const item = this.suggestions.indexOf(el);
    this.setSelectedItem(item, false);
  };

  private useSelectedItem(event: MouseEvent | KeyboardEvent): void {
    const currentValue = this.values[this.selectedItem];
    if (currentValue) {
      this.owner.selectSuggestion(currentValue, event);
    }
  }

  private setSelectedItem(
    selectedIndex: number,
    scrollIntoView: boolean,
  ): void {
    const normalizedIndex = wrapAround(selectedIndex, this.suggestions.length);
    const prevSelectedSuggestion = this.suggestions[this.selectedItem];
    const selectedSuggestion = this.suggestions[normalizedIndex];

    prevSelectedSuggestion?.removeClass('is-selected');
    selectedSuggestion?.addClass('is-selected');

    this.selectedItem = normalizedIndex;

    if (scrollIntoView) {
      selectedSuggestion.scrollIntoView(false);
    }
  }
}

/**
 * Reproduced with permission from
 * https://github.com/liamcain/obsidian-periodic-notes/blob/10fa35874d92750508967d4f1e58b3fa0eb87996/src/ui/suggest.ts
 * Author: Liam Cain
 */
abstract class TextInputSuggest<T> implements ISuggestOwner<T> {
  protected app: App;
  protected inputEl: HTMLInputElement;

  private popper: PopperInstance;
  private readonly scope: Scope;
  private readonly suggestEl: HTMLElement;
  private readonly suggest: Suggest<T>;

  constructor(app: App, inputEl: HTMLInputElement) {
    this.app = app;
    this.inputEl = inputEl;
    this.scope = new Scope();

    this.suggestEl = createDiv('suggestion-container');
    const suggestion = this.suggestEl.createDiv('suggestion');
    this.suggest = new Suggest(this, suggestion, this.scope);

    this.scope.register([], 'Escape', this.close);

    this.inputEl.addEventListener('input', this.onInputChanged);
    this.inputEl.addEventListener('focus', this.onInputChanged);
    this.inputEl.addEventListener('blur', this.close);
    this.suggestEl.on(
      'mousedown',
      '.suggestion-container',
      (event: MouseEvent) => {
        event.preventDefault();
      },
    );
  }

  public readonly open = (
    container: HTMLElement,
    inputEl: HTMLElement,
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.app as any).keymap.pushScope(this.scope);

    container.appendChild(this.suggestEl);
    this.popper = createPopper(inputEl, this.suggestEl, {
      placement: 'bottom-start',
      modifiers: [
        {
          name: 'sameWidth',
          enabled: true,
          fn: ({ state, instance }) => {
            // Note: positioning needs to be calculated twice -
            // first pass - positioning it according to the width of the popper
            // second pass - position it with the width bound to the reference element
            // we need to early exit to avoid an infinite loop
            const targetWidth = `${state.rects.reference.width}px`;
            if (state.styles.popper.width === targetWidth) {
              return;
            }
            state.styles.popper.width = targetWidth;
            instance.update();
          },
          phase: 'beforeWrite',
          requires: ['computeStyles'],
        },
      ],
    });
  };

  public readonly close = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.app as any).keymap.popScope(this.scope);

    this.suggest.setSuggestions([]);
    this.popper.destroy();
    this.suggestEl.detach();
  };

  private readonly onInputChanged = (): void => {
    const inputStr = this.inputEl.value;
    const suggestions = this.getSuggestions(inputStr);

    if (suggestions.length > 0) {
      this.suggest.setSuggestions(suggestions);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.open((this.app as any).dom.appContainerEl, this.inputEl);
    }
  };

  abstract getSuggestions(inputStr: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T): void;
}

export class StaticSuggest extends TextInputSuggest<string> {
  private readonly suggestions: string[];

  constructor(app: App, inputEl: HTMLInputElement, suggestions: string[]) {
    super(app, inputEl);
    this.suggestions = suggestions;
  }

  public getSuggestions = (inputStr: string): string[] =>
    this.suggestions.filter((val) =>
      val.toLowerCase().contains(inputStr.toLowerCase()),
    );

  public renderSuggestion = (string: string, el: HTMLElement): void => {
    el.setText(string);
  };

  public selectSuggestion = (string: string): void => {
    this.inputEl.value = string;
    this.inputEl.trigger('input');
    this.close();
  };
}

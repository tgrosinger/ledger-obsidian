import { Values } from './EditTransaction';
import { FieldProps } from 'formik';
import Fuse from 'fuse.js';
import React from 'react';
import { usePopper } from 'react-popper';

export const TextSuggest: React.FC<
  {
    placeholder: string;
    suggestions: string[];
    displayCount: number;
  } & FieldProps<string, Values>
> = (props): JSX.Element => {
  const [currentValue, setCurrentValue] = React.useState(props.field.value);
  const [currentSuggestions, setCurrentSuggestions] = React.useState(
    props.suggestions.slice(0, props.displayCount),
  );
  const [fuse, setFuse] = React.useState(
    new Fuse(props.suggestions, { threshold: 0.5 }),
  );

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [visible, setVisibility] = React.useState(false);
  const [referenceElement, setReferenceElement] =
    React.useState<HTMLElement | null>(null);
  const [popperElement, setPopperElement] = React.useState<HTMLElement | null>(
    null,
  );
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
  });

  const updateCurrentSuggestions = (newValue: string): void => {
    const newSuggestions =
      newValue === ''
        ? props.suggestions.slice(0, props.displayCount)
        : fuse
            .search(newValue)
            .map((result) => result.item)
            .slice(0, props.displayCount);
    setCurrentSuggestions(newSuggestions);
    setSelectedIndex(Math.min(selectedIndex, newSuggestions.length - 1));
  };

  // The Fuse object will not be automatically replaced when the suggestions are
  // changed so we need to detect and update manually.
  React.useEffect(() => {
    setFuse(new Fuse(props.suggestions, { threshold: 0.5 }));
    updateCurrentSuggestions(currentValue);
  }, [props.suggestions]);

  return (
    <>
      <input
        ref={setReferenceElement}
        type="text"
        value={currentValue}
        placeholder={props.placeholder}
        onChange={(e) => {
          setVisibility(true);
          setCurrentValue(e.target.value);
          updateCurrentSuggestions(e.target.value);
        }}
        onFocus={() => {
          setVisibility(true);
          setSelectedIndex(0);
        }}
        onBlur={(e) => {
          setVisibility(false);
          setCurrentValue(e.target.value);
          props.form.setFieldValue(props.field.name, e.target.value);
        }}
        onKeyDown={(e) => {
          switch (e.key) {
            case 'ArrowUp':
              setSelectedIndex(
                Math.clamp(selectedIndex - 1, 0, currentSuggestions.length - 1),
              );
              e.preventDefault();
              return;
            case 'ArrowDown':
              setSelectedIndex(
                Math.clamp(selectedIndex + 1, 0, currentSuggestions.length - 1),
              );
              e.preventDefault();
              return;
            case 'Enter':
              setCurrentValue(currentSuggestions[selectedIndex]);
              props.form.setFieldValue(
                props.field.name,
                currentSuggestions[selectedIndex],
              );
              setVisibility(false);
              e.preventDefault();
              return;
          }
        }}
      />

      {visible ? (
        <div
          className="suggestion-container"
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
        >
          {currentSuggestions.map((s, i) => (
            <Suggestion
              value={s}
              key={s}
              selected={i === selectedIndex}
              onClick={() => {
                setCurrentValue(s);
                props.form.setFieldValue(props.field.name, s);
                setCurrentValue(s);
                setVisibility(false);
              }}
              onHover={() => {
                setSelectedIndex(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
};

const Suggestion: React.FC<{
  value: string;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}> = ({ value, selected, onClick, onHover }): JSX.Element => (
  <div
    className={'suggestion-item ' + (selected ? 'is-selected' : '')}
    onMouseDown={onClick}
    onMouseOver={onHover}
  >
    {value}
  </div>
);

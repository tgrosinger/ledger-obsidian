import { WideInput } from './SharedStyles';
import React from 'react';
import { usePopper } from 'react-popper';
import Fuse from 'fuse.js';

export const TextSuggest: React.FC<{
  placeholder: string;
  suggestions: string[];
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}> = ({ placeholder, suggestions, value, setValue }): JSX.Element => {
  const [currentSuggestions, setCurrentSuggestions] =
    React.useState(suggestions);
  const [fuse, _] = React.useState(new Fuse(suggestions, { threshold: 0.5 }));

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [visible, setVisibility] = React.useState(false);
  const [referenceElement, setReferenceElement] = React.useState(null);
  const [popperElement, setPopperElement] = React.useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
  });

  const updateValue = (newValue: string): void => {
    setValue(newValue);
    const newSuggestions = fuse.search(newValue).map((result) => result.item);
    setCurrentSuggestions(newSuggestions);
    setSelectedIndex(Math.max(selectedIndex, newSuggestions.length - 1));
  };

  const makeSelectSuggestion =
    (s: string): (() => void) =>
    () => {
      setValue(s);
      setVisibility(false);
    };

  return (
    <div>
      <WideInput
        ref={setReferenceElement}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => updateValue(e.target.value)}
        onFocus={() => {
          setVisibility(true);
          setSelectedIndex(0);
        }}
        onBlur={() => setVisibility(false)}
        onKeyDown={(e) => {
          switch (e.key) {
            case 'ArrowUp':
              setSelectedIndex(selectedIndex - 1);
              e.preventDefault();
              return;
            case 'ArrowDown':
              setSelectedIndex(selectedIndex + 1);
              e.preventDefault();
              return;
            case 'Enter':
              setVisibility(false);
              updateValue(currentSuggestions[selectedIndex]);
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
              onClick={makeSelectSuggestion(s)}
              onHover={() => {
                setSelectedIndex(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
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

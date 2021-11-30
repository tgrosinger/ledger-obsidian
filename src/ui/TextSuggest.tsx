import { WideInput } from './SharedStyles';
import Fuse from 'fuse.js';
import { take } from 'lodash';
import React from 'react';
import { usePopper } from 'react-popper';

export const TextSuggest: React.FC<{
  placeholder: string;
  displayCount: number;
  suggestions: string[];
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}> = ({
  placeholder,
  displayCount,
  suggestions,
  value,
  setValue,
}): JSX.Element => {
  const [currentSuggestions, setCurrentSuggestions] = React.useState(
    take(suggestions, displayCount),
  );
  const [fuse, _] = React.useState(new Fuse(suggestions, { threshold: 0.5 }));

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const [visible, setVisibility] = React.useState(false);
  const [referenceElement, setReferenceElement] = React.useState(null);
  const [popperElement, setPopperElement] = React.useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
  });

  const updateValue = (newValue: string): void => {
    setVisibility(true);
    setValue(newValue);
    const newSuggestions = take(
      fuse.search(newValue).map((result) => result.item),
      displayCount,
    );
    setCurrentSuggestions(newSuggestions);
    setSelectedIndex(Math.min(selectedIndex, newSuggestions.length - 1));
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
              setValue(currentSuggestions[selectedIndex]);
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
                setValue(s);
                setVisibility(false);
              }}
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

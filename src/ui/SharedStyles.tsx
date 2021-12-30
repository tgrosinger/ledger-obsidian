import { prependOnceListener } from 'process';
import React from 'react';
import styled from 'styled-components';

export const FlexContainer = styled.div`
  display: flex;
`;
export const FlexShrink = styled.div`
  flex-grow: 0;
  flex-shrink: 1;
`;
export const FlexFloatRight = styled.div`
  margin-left: auto;
  flex-shrink: 1;
`;
export const FlexMainContent = styled.div`
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 1;
`;

export const WideInput = styled.input`
  width: 100%;
`;

export const DatePicker = styled.input`
  background: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
  padding: 5px 14px;
  border-radius: 4px;
  height: 30px;
`;

export const WideDatePicker = styled(DatePicker)`
  width: 100%;
`;

export const WideSelect = styled.select`
  width: 100%;
`;

export const Button: React.FC<{
  className?: string;
  selected: boolean;
  action?: () => void;
}> = (props): JSX.Element => {
  const className = [props.className, props.selected ? 'mod-cta' : null]
    .filter((n) => n)
    .join(' ');
  return (
    <button className={className} onClick={props.action}>
      {props.children}
    </button>
  );
};

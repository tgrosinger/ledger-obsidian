import React from 'react';
import styled from 'styled-components';

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
  selected: boolean;
  action?: () => void;
}> = (props): JSX.Element => (
  <button className={props.selected ? 'mod-cta' : ''} onClick={props.action}>
    {props.children}
  </button>
);

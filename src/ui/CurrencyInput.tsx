import { WideInput } from './SharedStyles';
import React from 'react';
import styled from 'styled-components';

const InputWithIconWrapper = styled.div`
  position: relative;
`;

const InputWithIcon = styled(WideInput)`
  /* important required to override mobile stylesheet */
  padding-left: 25px !important;
`;

const InputIcon = styled.i`
  position: absolute;
  display: block;
  transform: translate(0, -50%);
  top: 50%;
  pointer-events: none;
  width: 25px;
  text-align: center;
  font-style: normal;
`;

export const CurrencyInput: React.FC<{
  currencySymbol: string;
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
}> = ({ currencySymbol, amount, setAmount }): JSX.Element => (
  <InputWithIconWrapper>
    <InputWithIcon
      placeholder="Amount"
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      onBlur={() => setAmount(parseFloat(amount).toFixed(2))}
    />
    <InputIcon>{currencySymbol}</InputIcon>
  </InputWithIconWrapper>
);

import { Values } from './EditTransaction';
import { FieldProps } from 'formik';
import React from 'react';
import styled from 'styled-components';

const InputWithIconWrapper = styled.div`
  position: relative;
`;

const InputWithIcon = styled.input`
  /* important required to override mobile stylesheet */
  padding-left: 25px !important;
  width: 100%;
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

export const CurrencyInputFormik: React.FC<
  {
    currencySymbol: string;
    placeholder: string | undefined;
    disabled?: boolean;
  } & FieldProps<string, Values>
> = (props): JSX.Element => (
  <CurrencyInput
    placeholder={props.placeholder || 'Amount'}
    currencySymbol={props.currencySymbol}
    amount={props.field.value}
    setValue={(newValue: string) => {
      props.form.setFieldValue(props.field.name, newValue);
    }}
    disabled={props.disabled || false}
  />
);

export const CurrencyInput: React.FC<{
  placeholder: string;
  currencySymbol: string;
  amount: string;
  setValue: (newValue: string) => void;
  disabled?: boolean;
}> = ({
  placeholder,
  currencySymbol,
  amount,
  setValue,
  disabled,
}): JSX.Element => (
  <InputWithIconWrapper>
    <InputWithIcon
      placeholder={placeholder}
      disabled={disabled || false}
      type="number"
      value={amount}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const val = amount.length > 0 ? parseFloat(amount).toFixed(2) : '';
        setValue(val);
      }}
    />
    <InputIcon>{currencySymbol}</InputIcon>
  </InputWithIconWrapper>
);

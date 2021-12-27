import React from 'react';
import { Error } from 'src/error';
import { TransactionCache } from 'src/parser';
import styled from 'styled-components';

const ErrorDiv = styled.div`
  color: var(--text-error);
  background: var(--background-secondary);
  padding: 10px;
  margin: 10px 10px 10px 0;
  cursor: pointer;
`;
const ErrorDetailsDiv = styled.div`
  background: var(--background-primary-alt);
  padding: 20px;
  margin: 10px;
`;

export const ParseErrors: React.FC<{
  txCache: TransactionCache;
}> = (props): JSX.Element => (
  <div>
    {props.txCache.parsingErrors.map((error: Error, i) => (
      <ErrorDetail key={i} error={error} />
    ))}
  </div>
);

const ErrorDetail: React.FC<{
  error: Error;
}> = (props): JSX.Element => {
  const [expanded, setExpanded] = React.useState(false);

  const expandedDetails =
    'transaction' in props.error ? (
      <>
        <p>The erroneous transaction:</p>
        <pre>
          {props.error.transaction.block
            ? props.error.transaction.block.block
            : `${props.error.transaction.value.date} ${props.error.transaction.value.payee}`}
        </pre>
      </>
    ) : (
      <>
        <p>The erroneous transaction:</p>
        <pre>{props.error.block.block}</pre>
      </>
    );

  return (
    <ErrorDiv
      onClick={() => {
        setExpanded(!expanded);
      }}
    >
      Parsing Error: {props.error.message}
      {expanded ? <ErrorDetailsDiv>{expandedDetails}</ErrorDetailsDiv> : null}
    </ErrorDiv>
  );
};

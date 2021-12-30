import { Interval } from '../date-utils';
import {
  Button,
  DatePicker,
  FlexContainer,
  FlexFloatRight,
  FlexShrink,
} from './SharedStyles';
import { Moment } from 'moment';
import { Notice } from 'obsidian';
import React from 'react';
import styled from 'styled-components';

const MarginSpan = styled.span`
  margin: 0 12px;
`;

export const DateRangeSelector: React.FC<{
  startDate: Moment;
  endDate: Moment;
  setStartDate: React.Dispatch<React.SetStateAction<Moment>>;
  setEndDate: React.Dispatch<React.SetStateAction<Moment>>;
  interval: Interval;
  setInterval: React.Dispatch<React.SetStateAction<Interval>>;
}> = (props): JSX.Element => (
  <FlexContainer>
    <FlexFloatRight className="ledger-interval-selectors">
      <Button
        selected={props.interval === 'day'}
        action={() => {
          props.setInterval('day');
          validateAndUpdateEndDate(
            'day',
            props.startDate,
            props.endDate,
            props.setEndDate,
          );
        }}
      >
        Daily
      </Button>
      <Button
        selected={props.interval === 'week'}
        action={() => {
          props.setInterval('week');
          validateAndUpdateEndDate(
            'week',
            props.startDate,
            props.endDate,
            props.setEndDate,
          );
        }}
      >
        Weekly
      </Button>
      <Button
        selected={props.interval === 'month'}
        action={() => {
          props.setInterval('month');
          validateAndUpdateEndDate(
            'month',
            props.startDate,
            props.endDate,
            props.setEndDate,
          );
        }}
      >
        Monthly
      </Button>
    </FlexFloatRight>

    <FlexShrink className="ledger-daterange-selectors">
      <DatePicker
        type="date"
        placeholder="Start"
        value={props.startDate.format('YYYY-MM-DD')}
        onChange={(e) => {
          const newDate = window.moment(e.target.value);
          props.setStartDate(newDate);
          if (newDate.isAfter(props.endDate)) {
            props.setEndDate(newDate);
          } else {
            validateAndUpdateEndDate(
              props.interval,
              newDate,
              props.endDate,
              props.setEndDate,
            );
          }
        }}
      />
      <MarginSpan>➜</MarginSpan>
      <DatePicker
        type="date"
        placeholder="End"
        value={props.endDate.format('YYYY-MM-DD')}
        max={window.moment().format('YYYY-MM-DD')}
        onChange={(e) => {
          const newDate = window.moment(e.target.value);
          props.setEndDate(newDate.clone());
          if (newDate.isBefore(props.startDate)) {
            props.setStartDate(newDate);
          } else {
            validateAndUpdateStartDate(
              props.interval,
              props.startDate,
              newDate,
              props.setStartDate,
            );
          }
        }}
      />
    </FlexShrink>
  </FlexContainer>
);

const validateAndUpdateStartDate = (
  interval: Interval,
  startDate: Moment,
  endDate: Moment,
  setStartDate: React.Dispatch<React.SetStateAction<Moment>>,
): void => {
  if (endDate.diff(startDate, interval) > 15) {
    new Notice('Exceeded maximum time window. Adjusting start date.');
    setStartDate(endDate.subtract(15, interval));
  }
};

const validateAndUpdateEndDate = (
  interval: Interval,
  startDate: Moment,
  endDate: Moment,
  setEndDate: React.Dispatch<React.SetStateAction<Moment>>,
): void => {
  if (endDate.diff(startDate, interval) > 15) {
    new Notice('Exceeded maximum time window. Adjusting end date.');
    setEndDate(startDate.clone().add(15, interval));
  }
};

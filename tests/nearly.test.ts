import { Grammar, Parser } from 'nearley';

import grammar from '../grammar/ledger';

let parser: Parser;
beforeEach(() => {
  parser = new Parser(Grammar.fromCompiled(grammar));
});

describe('parsing multiple blocks', () => {
  test('when there are not newlines separating blocks', () => {
    parser.feed(`; This is a comment\n`);
    parser.feed('alias Dining=Expenses:Entertainment:Dining\n');
    parser.feed(`2018-04-03 (1234) Half & Price-Books\n`);
    parser.feed('    Expenses:Books   $3,454,500\n');
    parser.feed('    Assets:Checking  $5,321.45');

    expect(parser.results).toEqual([
      [
        { type: 'comment', value: 'This is a comment' },
        {
          type: 'alias',
          value: {
            left: 'Dining',
            right: 'Expenses:Entertainment:Dining',
          },
        },
        {
          type: 'tx',
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 3454500,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 5321.45,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
});

describe('parsing a comment', () => {
  test('when it is a simple comment', () => {
    parser.feed('; This is a comment');

    expect(parser.results).toEqual([
      [{ type: 'comment', value: 'This is a comment' }],
    ]);
  });
  test('when there is no space', () => {
    parser.feed(';This is a comment');

    expect(parser.results).toEqual([
      [{ type: 'comment', value: 'This is a comment' }],
    ]);
  });
});

describe('parsing an alias', () => {
  test('when it is a simple alias', () => {
    parser.feed('alias Dining=Expenses:Entertainment:Dining');

    expect(parser.results).toEqual([
      [
        {
          type: 'alias',
          value: {
            left: 'Dining',
            right: 'Expenses:Entertainment:Dining',
          },
        },
      ],
    ]);
  });
});

describe('parsing a transaction', () => {
  test('when there are more than two expense lines', () => {
    parser.feed(`2018-04-03 Half Price Books\n`);
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Expenses:Food:Grocery  $25\n');
    parser.feed('    Assets:Checking  $-300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: undefined,
            date: '2018-04-03',
            payee: 'Half Price Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 25,
                currency: '$',
                category: 'Expenses:Food:Grocery',
                reconcile: '',
                comment: '',
              },
              {
                amount: -300,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a pending expense line', () => {
    parser.feed(`2018-04-03 Half Price Books\n`);
    parser.feed('    Expenses:Books   $300\n');
    parser.feed(' !  Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: undefined,
            date: '2018-04-03',
            payee: 'Half Price Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 300,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '!',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a a check number', () => {
    parser.feed(`2018-04-03 (1234) Half Price Books\n`);
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half Price Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 300,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there are commas in numbers', () => {
    parser.feed(`2018-04-03 (1234) Half & Price-Books\n`);
    parser.feed('    Expenses:Books   $3,454,500\n');
    parser.feed('    Assets:Checking  $5,321.45');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 3454500,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 5321.45,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there are special characters in the payee', () => {
    parser.feed(`2018-04-03 (1234) Half & Price-Books\n`);
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 300,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a full-line comment', () => {
    parser.feed(`2018-04-03 (1234) Half Price Books\n`);
    parser.feed('    ; This is a comment\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half Price Books',
            expenselines: [
              {
                comment: 'This is a comment',
              },
              {
                amount: 300,
                currency: '$',
                category: 'Expenses:Books',
                reconcile: '',
                comment: '',
              },
              {
                amount: 300,
                currency: '$',
                category: 'Assets:Checking',
                comment: '',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
});

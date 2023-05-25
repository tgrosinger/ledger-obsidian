import grammar from '../grammar/ledger';
import { Grammar, Parser } from 'nearley';

let parser: Parser;
beforeEach(() => {
  parser = new Parser(Grammar.fromCompiled(grammar));
});

const ASSERTIONS = ['=', '=*', '==', '==*']

describe('parsing multiple blocks', () => {
  test('when there are not newlines separating blocks', () => {
    parser.feed('; This is a comment\n');
    parser.feed('alias Dining=Expenses:Entertainment:Dining\n');
    parser.feed('2018-04-03 (1234) Half & Price-Books\n');
    parser.feed('    Expenses:Books   $3,454,500\n');
    parser.feed('    Assets:Checking  $5,321.45');

    expect(parser.results).toEqual([
      [
        { type: 'comment', blockLine: 1, value: 'This is a comment' },
        {
          type: 'alias',
          blockLine: 2,
          value: {
            left: 'Dining',
            right: 'Expenses:Entertainment:Dining',
          },
        },
        {
          type: 'tx',
          blockLine: 3,
          value: {
            check: 1234,
            date: '2018-04-03',
            reconcile: '',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 3454500,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 5321.45,
                currency: '$',
                account: 'Assets:Checking',
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
      [{ type: 'comment', blockLine: 1, value: 'This is a comment' }],
    ]);
  });
  test('when there is no space', () => {
    parser.feed(';This is a comment');

    expect(parser.results).toEqual([
      [{ type: 'comment', blockLine: 1, value: 'This is a comment' }],
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
          blockLine: 1,
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
    parser.feed('2018-04-03 Half Price Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Expenses:Food:Grocery  $25\n');
    parser.feed('    Assets:Checking  $-300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            check: undefined,
            date: '2018-04-03',
            payee: 'Half Price Books',
            reconcile: '',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 25,
                currency: '$',
                account: 'Expenses:Food:Grocery',
                reconcile: '',
              },
              {
                amount: -300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a pending expense line', () => {
    parser.feed('2018-04-03 Half Price Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed(' !  Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            check: undefined,
            date: '2018-04-03',
            payee: 'Half Price Books',
            reconcile: '',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '!',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a a check number', () => {
    parser.feed('2018-04-03 (1234) Half Price Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half Price Books',
            reconcile: '',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there are commas in numbers', () => {
    parser.feed('2018-04-03 (1234) Half & Price-Books\n');
    parser.feed('    Expenses:Books   $3,454,500\n');
    parser.feed('    Assets:Checking  $5,321.45');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            reconcile: '',
            expenselines: [
              {
                amount: 3454500,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 5321.45,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there are special characters in the payee', () => {
    parser.feed('2018-04-03 (1234) Half & Price-Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            reconcile: '',
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when the expense has reconciliation', () => {
    parser.feed('2018-04-03 * (1234) Half & Price-Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            reconcile: '*',
            check: 1234,
            date: '2018-04-03',
            payee: 'Half & Price-Books',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test('when there is a full-line comment', () => {
    parser.feed('2018-04-03 (1234) Half Price Books\n');
    parser.feed('    ; This is a comment\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed('    Assets:Checking  $300');

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            check: 1234,
            date: '2018-04-03',
            payee: 'Half Price Books',
            reconcile: '',
            expenselines: [
              {
                comment: 'This is a comment',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
  test.each(ASSERTIONS)('when there is a  "%s" balance assertion', (assertion) => {
    parser.feed('2018-04-03 Half Price Books\n');
    parser.feed('    Expenses:Books   $300\n');
    parser.feed(`    Assets:Checking  $300 ${assertion} $300`);

    expect(parser.results).toEqual([
      [
        {
          type: 'tx',
          blockLine: 1,
          value: {
            date: '2018-04-03',
            payee: 'Half Price Books',
            reconcile: '',
            expenselines: [
              {
                amount: 300,
                currency: '$',
                account: 'Expenses:Books',
                reconcile: '',
              },
              {
                amount: 300,
                currency: '$',
                account: 'Assets:Checking',
                reconcile: '',
              },
            ],
          },
        },
      ],
    ]);
  });
});

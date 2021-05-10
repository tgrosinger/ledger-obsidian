@preprocessor typescript

### Not supported ###
#
# Transactions:
# - Metadata (https://www.ledger-cli.org/3.0/doc/ledger3.html#Metadata)
# - Virtual postings (https://www.ledger-cli.org/3.0/doc/ledger3.html#Virtual-postings)
# - Expression amounts (https://www.ledger-cli.org/3.0/doc/ledger3.html#Expression-amounts)
# - Balance assertions (https://www.ledger-cli.org/3.0/doc/ledger3.html#Balance-assertions)
# - Balance assignments (https://www.ledger-cli.org/3.0/doc/ledger3.html#Balance-assignments)
# - Commodities (https://www.ledger-cli.org/3.0/doc/ledger3.html#Commodity-prices)
#
# Command Directives: (https://www.ledger-cli.org/3.0/doc/ledger3.html#Command-Directives)
# - All except the `alias` command


@{%
    // https://github.com/no-context/moo
    import moo from 'moo';

    const lexer = moo.states({
      main: {
        date: { match: /[0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}/, next: 'txStart' },
        alias: { match: 'alias', next: 'alias' },
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
      },
      txStart: {
        check: { match: /\([0-9]+\)[ \t]+/, value: (s:string) => s.trim().slice(1, -1) },
        ws:     /[ \t]+/,
        payee: { match: /[a-zA-Z0-9 ]+/, value: (s:string) => s.trim() },
        reconciled: /[!*]/,
        newline: { match: '\n', lineBreaks: true, next: 'expenseLine'},
      },
      expenseLine: {
        newline: { match: '\n', lineBreaks: true },
        ws:     /[ \t]+/,
        number: /-?[0-9.]+/,
        category: { match: /[a-zA-Z0-9: ]+/, value: (s:string) => s.trim() },
        currency: /[$£₤€₿₹¥₩]/,
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
        reconciled: /[!*]/,
      },
      alias: {
        category: { match: /[a-zA-Z0-9: ]+/, value: (s:string) => s.trim() },
        equal: '=',
      },
    });
%}

@lexer lexer

main ->
    transaction  {% ([t]) => { return { type: 'tx', value: t } } %}
  | %comment     {% ([c]) => { return { type: 'comment', value: c.value } } %}
  | alias        {% ([a]) => { return { type: 'alias', value: a } } %}

transaction -> %date %ws check:? %payee %newline expenselines
                                                  {%
                                                    function(d) {
                                                      return {
                                                        date: d[0].value,
                                                        check: d[2] || undefined,
                                                        payee: d[3].value,
                                                        expenselines: d[5]
                                                      }
                                                    }
                                                  %}

expenselines ->
    expenseline                                   {% ([l]) => l %}
  | expenselines %newline expenseline             {% ([rest,,l]) => { return [rest,l].flat(1) } %}

expenseline ->
    %ws:+ reconciled:? %category amount:? %ws:* %comment:?
                                                  {%
                                                    function(d) {
                                                      return {
                                                        reconcile: d[1] || '',
                                                        category: d[2].value,
                                                        currency: d[3]?.currency,
                                                        amount: d[3]?.amount,
                                                        comment: d[5]?.value || '',
                                                      }
                                                    }
                                                  %}
  | %ws:+ %comment                                {% ([,c]) => { return {comment: c.value} } %}

reconciled -> %reconciled %ws:+                   {% ([r,]) => r.value %}
alias -> "alias" %category %equal %category       {% ([,l,,r]) => { return { left: l.value, right: r.value } } %}
amount -> %currency %number                       {% ([c,a]) => { return {currency: c.value, amount: parseFloat(a.value)} } %}
check -> %check                                   {% ([c]) => parseFloat(c.value) %}
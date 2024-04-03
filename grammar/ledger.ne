@preprocessor typescript

### Partially supported ###
# Transactions
# - Balance assertions (https://www.ledger-cli.org/3.0/doc/ledger3.html#Balance-assertions)
#   - parsed but ignored in output
### Not supported ###
#
# Transactions:
# - Metadata (https://www.ledger-cli.org/3.0/doc/ledger3.html#Metadata)
# - Virtual postings (https://www.ledger-cli.org/3.0/doc/ledger3.html#Virtual-postings)
# - Expression amounts (https://www.ledger-cli.org/3.0/doc/ledger3.html#Expression-amounts)
# - Balance assignments (https://www.ledger-cli.org/3.0/doc/ledger3.html#Balance-assignments)
# - Commodities (https://www.ledger-cli.org/3.0/doc/ledger3.html#Commodity-prices)
#
# Command Directives: (https://www.ledger-cli.org/3.0/doc/ledger3.html#Command-Directives)
# - All except the `alias` command

# TODO: Currently a blank line is required between transaction entries.

@{%
    // https://github.com/no-context/moo
    import moo from 'moo';

    const lexer = moo.states({
      main: {
        date: { match: /[0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}/, next: 'txStart' },
        alias: { match: 'alias', next: 'alias' },
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
        newline: { match: '\n', lineBreaks: true },
      },
      txStart: {
        check: { match: /\([0-9]+\)[ \t]+/, value: (s:string) => s.trim().slice(1, -1) },
        ws:     /[ \t]+/,
        reconciled: /[!*]/,
        payee: { match: /[^!*;#|\n][^!;#|\n]+/, value: (s:string) => s.trim() },
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
        newline: { match: '\n', lineBreaks: true, next: 'expenseLine'},
      },
      expenseLine: {
        newline: { match: '\n', lineBreaks: true },
        ws:     /[ \t]+/,
        absoluteNumber: { match: /[0-9.,]+/, value: (s:string) => s.replace(/,/g, '') },
        numberSign: /-/,
        currency: /[$£₤€₿₹¥￥₩Р₽₴₫]/, // Note: Р != P
        reconciled: /[!*]/,
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
        assertion: {match: /==?\*?/},
        account: { match: /[^$£₤€₿₹¥￥₩Р₽₴₫;#|\n\-]+/, value: (s:string) => s.trim() },
      },
      alias: {
        account: { match: /[a-zA-Z0-9: ]+/, value: (s:string) => s.trim() },
        equal: '=',
        newline: { match: '\n', lineBreaks: true, next: 'main' },
      },
    });
%}

@lexer lexer

main ->
    element
  | main %newline element                     {% ([rest,,l]) => { return [rest,l].flat(1) } %}

element ->
    transaction  {% ([t]) => { var l = t.blockLine; delete t.blockLine; return { type: 'tx', blockLine: l, value: t } } %}
  | %comment     {% ([c]) => { return { type: 'comment', blockLine: c.line, value: c.value } } %}
  | alias        {% ([a]) => { var l = a.blockLine; delete a.blockLine; return { type: 'alias', blockLine: l, value: a } } %}

transaction -> %date %ws check:? %payee %comment:? %newline expenselines
                                                  {%
                                                    function(d) {
                                                      return {
                                                        blockLine: d[0].line,
                                                        date: d[0].value,
                                                        check: d[2] || undefined,
                                                        payee: d[3].value,
                                                        comment: d[4]?.value || undefined,
                                                        expenselines: d[6]
                                                      }
                                                    }
                                                  %}

expenselines ->
    expenseline                                   {% ([l]) => l %}
  | expenselines %newline expenseline             {% ([rest,,l]) => { return [rest,l].flat(1) } %}

expenseline ->
    %ws:+ reconciled:? %account amount:? balance:? %ws:* %comment:?
                                                  {%
                                                    function([,r,acct,amt,_ba,,cmt]) {
                                                      return {
                                                        reconcile: r || '',
                                                        account: acct.value,
                                                        currency: amt?.currency,
                                                        amount: amt?.amount,
                                                        comment: cmt?.value,
                                                      }
                                                    }
                                                  %}
  | %ws:+ %comment                                {% ([,c]) => { return {comment: c.value} } %}

balance -> %ws:* %assertion %ws:+ amount                      {% (d) => {return {}} %}
reconciled -> %reconciled %ws:+                   {% ([r,]) => r.value %}
alias -> "alias" %account %equal %account         {% ([,l,,r]) => { return { blockLine: l.line, left: l.value, right: r.value } } %}
amount -> %currency %absoluteNumber                       {% ([c,a]) => { return {currency: c.value, amount: parseFloat(a.value)} } %}
amount -> %currency %numberSign %absoluteNumber                       {% ([c,ns,a]) => { return {currency: c.value, amount: parseFloat(ns.value + a.value)} } %}
amount -> %numberSign %currency %absoluteNumber                       {% ([ns,c,a]) => { return {currency: c.value, amount: parseFloat(ns.value + a.value)} } %}
check -> %check                                   {% ([c]) => parseFloat(c.value) %}

@preprocessor typescript

@{%
    // https://github.com/no-context/moo
    const moo = require("moo")
    const lexer = moo.states({
      main: {
        date: { match: /[0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}/, next: 'txStart' },
        alias: { match: 'alias', next: 'alias' },
        comment: { match: /[;#|][^\n]+/, value: (s:string) => s.slice(1).trim() },
      },
      txStart: {
        check: { match: /\([0-9]+\)[ \t]+/, value: (s:string) => parseFloat(s.trim().slice(1, -1)) },
        ws:     /[ \t]+/,
        payee: { match: /[a-zA-Z0-9 ]+/, value: (s:string) => s.trim() },
        reconciled: /[!*]/,
        newline: { match: '\n', lineBreaks: true, next: 'expenseLine'},
      },
      expenseLine: {
        newline: { match: '\n', lineBreaks: true },
        ws:     /[ \t]+/,
        number: { match: /-?[0-9.]+/, value: (s:string) => parseFloat(s) },
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
    transaction  {% ([tx]) => { return { type: 'tx', value: tx } } %}
  | %comment     {% ([c]) => { return { type: 'comment', value: c.value } } %}
  | account      {% ([a]) => { return { type: 'account', value: a } } %}
  | alias        {% ([a]) => { return { type: 'alias', value: a } } %}

transaction -> %date %ws %check:? %payee %newline expenselines
                                                  {%
                                                    function(d) {
                                                      return {
                                                        date: d[0].value,
                                                        check: d[2] ? d[2].value : undefined,
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
                                                        category: d[2].value,
                                                        currency: d[3] ? d[3].currency : undefined,
                                                        amount: d[3] ? d[3].amount : undefined,
                                                        comment: d[5] ? d[5].value : '',
                                                        reconcile: d[1] ? d[1] : '',
                                                      }
                                                    }
                                                  %}
  | %ws:+ %comment                                 {% ([,c]) => { return {comment: c.value} } %}

account -> "account"
reconciled -> %reconciled %ws:+                   {% ([r,]) => r.value %}
alias -> "alias" %category %equal %category       {% ([,l,,r]) => { return { left: l.value, right: r.value } } %}
amount -> %currency %number                       {% ([c,a]) => { return {currency: c.value, amount: a.value} } %}
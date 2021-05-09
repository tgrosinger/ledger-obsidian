@preprocessor typescript

@{%
    // https://github.com/no-context/moo
    const moo = require("moo")
    const lexer = moo.compile({
      newline: {match: '\n', lineBreaks: true},
      ws:     /[ \t]+/,
      alias: /alias/,
      account: /account/,
      date: /[0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}/,
      number: /-?[0-9.]+/,
      word: /[a-zA-Z]+/,
      currency: /[$£₤€₿₹¥₩]/,
      comment: /[;#|]/,
      equal: /=/,
      colon: /:/,
      reconciled: /[!*]/,
      lparen: /\(/,
      rparen: /\)/,
    });
%}

# Pass your lexer with @lexer:
@lexer lexer

main ->
    transaction  {% function(d) { return { type: 'tx', value: d[0] } } %}
  | comment      {% function(d) { return { type: 'comment', value: d[0] } } %}
  | account      {% function(d) { return { type: 'account', value: d[0] } } %}
  | alias        {% function(d) { return { type: 'alias',   value: d[0] } } %}

transaction -> %date %ws check:? payee %newline expenselines   {%
                                                        function(d) {
                                                          return {
                                                            date: d[0].value,
                                                            check: d[2] ? d[2] : undefined,
                                                            payee: d[3],
                                                            expenselines: d[5]
                                                          }
                                                        }
                                                      %}

# TODO: Look into writing postprocessors in TS and then using types in tests
# TODO: Look into using external TS functions to validate expense lines add up correctly

expenselines ->
    expenseline                                       {% function(d) { return d[0] } %}
  | expenselines %newline expenseline                 {% function(d) { return [d[0], d[2]].flat(1) } %}

expenseline ->
    %ws:+ reconciled:? category amount:? %ws:* comment:? {%
                                                        function(d) {
                                                          return {
                                                            category: d[2],
                                                            currency: d[3] ? d[3].currency : undefined,
                                                            amount: d[3] ? d[3].amount : undefined,
                                                            comment: d[5] ? d[5] : '',
                                                            reconcile: d[1] ? d[1] : '',
                                                          }
                                                        }
                                                      %}
  | %ws:+ comment                                     {%
                                                        function(d) {
                                                          return { comment: d[1] }
                                                        }
                                                      %}
account -> %account
reconciled -> %reconciled %ws:+                       {% function(d) { return d[0].value } %}
alias -> %alias %ws:+ category %equal category        {% function(d) { return { left: d[2], right: d[4] } } %}
comment -> %comment %ws:+ words                       {% function(d) { return d[2] } %}
category ->
    %word                                             {% function(d) { return d[0].value } %}
  | category %colon %word                             {% function(d) { return `${d[0]}:${d[2].value}` } %}
  | category %ws %word                                {% function(d) { return `${d[0]} ${d[2].value}` } %}
words ->
    %word                                             {% function(d) { return d[0].value } %}
  | words %ws %word                                   {% function(d) { return `${d[0]} ${d[2].value}` } %}
check -> %lparen %number %rparen %ws:+                {% function(d) { return parseFloat(d[1].value) } %}
payee -> words                                        {% function(d) { return d[0] } %}
amount -> %ws:+ %currency %number                     {%
                                                        function(d) {
                                                          return {
                                                            currency: d[1].value,
                                                            amount: parseFloat(d[2].value),
                                                          }
                                                        }
                                                      %}
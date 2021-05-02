#@preprocessor typescript

@{%
    // https://github.com/no-context/moo
    // TODO: Add more currency symbols
    const moo = require("moo")
    const lexer = moo.compile({
      newline: {match: '\n', lineBreaks: true},
      ws:     /[ \t]+/,
      date: /[0-9]{4}[-\/][0-9]{2}[-\/][0-9]{2}/,
      number: /-?[0-9]+/,
      times: /\*|times/,
      word: /[a-zA-Z]+/,
      currency: /[$£₤€]/,
      comment: /[;#|*]/,
	  lparen: /\(/,
	  rparen: /\)/,
    });
%}

# Pass your lexer with @lexer:
@lexer lexer

main -> transactions %newline:* {% ([tx, _]) => tx %}

transactions -> transaction                           {% function(d) { return d[0] }%}
    | transactions %newline:+ transaction             {% function(d) { return [d[0], d[2]].flat(1)} %}
    
transaction -> %date %ws payee %newline expenselines    {% function(d) {
                                                          return {
                                                            date: d[0].value,
                                                            payee: d[2],
                                                            expenselines: d[4]}
                                                          }
                                                        %}


expenselines -> expenseline                           {% function(d) { return d[0] } %}
    | expenselines %newline expenseline               {% function(d) { return [d[0], d[2]].flat(1) } %}

expenseline -> %word %ws amount                       {% function(d) { 
                                                          return {
                                                            category: d[0].value,
                                                            currency: d[2][0].value,
                                                            amount: d[2][1].value}
                                                          }
                                                       %}

check -> %lparen %number %rparen
payee -> %word                                        {% function(d) { return d[0].value } %}
amount -> %currency %number

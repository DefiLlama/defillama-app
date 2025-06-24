import { createToken, Lexer, CstParser, IToken, CstNode, EOF } from 'chevrotain'

const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\r\n]+/, group: Lexer.SKIPPED })
const Assign = createToken({ name: 'Assign', pattern: /=/ })
const LParen = createToken({ name: 'LParen', pattern: /\(/ })
const RParen = createToken({ name: 'RParen', pattern: /\)/ })
const Comma = createToken({ name: 'Comma', pattern: /,/ })
const Dot = createToken({ name: 'Dot', pattern: /\./ })
const StringLiteral = createToken({ name: 'StringLiteral', pattern: /"[^"]*"|'[^']*'/ })
const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /[0-9]+(\.[0-9]+)?/ })
const TrueLiteral = createToken({ name: 'TrueLiteral', pattern: /true/ })
const FalseLiteral = createToken({ name: 'FalseLiteral', pattern: /false/ })
const Comment = createToken({ name: 'Comment', pattern: /\/\/[^\n\r]*/, group: Lexer.SKIPPED })
const And = createToken({ name: 'And', pattern: /AND/ })
const Or = createToken({ name: 'Or', pattern: /OR/ })
const Not = createToken({ name: 'Not', pattern: /NOT/ })
const Eq = createToken({ name: 'Eq', pattern: /==/ })
const Neq = createToken({ name: 'Neq', pattern: /!=/ })
const Gte = createToken({ name: 'Gte', pattern: />=/ })
const Lte = createToken({ name: 'Lte', pattern: /<=/ })
const Gt = createToken({ name: 'Gt', pattern: />/ })
const Lt = createToken({ name: 'Lt', pattern: /</ })
const Plus = createToken({ name: 'Plus', pattern: /\+/ })
const Minus = createToken({ name: 'Minus', pattern: /-/ })
const Mult = createToken({ name: 'Mult', pattern: /\*/ })
const Div = createToken({ name: 'Div', pattern: /\// })
// const Highlight = createToken({ name: 'Highlight', pattern: /highlight/ }) //TODO: implement highlights at chart component
const Plot = createToken({ name: 'Plot', pattern: /plot/ })
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ })
const LBracket = createToken({ name: 'LBracket', pattern: /\[/ })
const RBracket = createToken({ name: 'RBracket', pattern: /\]/ })

export const allTokens = [
	WhiteSpace,
	Comment,
	And,
	Or,
	Not,
	Eq,
	Neq,
	Gte,
	Lte,
	Gt,
	Lt,
	Plus,
	Minus,
	Mult,
	Div,
	Assign,
	LParen,
	RParen,
	Comma,
	Dot,
	// Highlight,
	Plot,
	LBracket,
	RBracket,
	StringLiteral,
	NumberLiteral,
	TrueLiteral,
	FalseLiteral,
	Identifier
]

export const LlamaScriptLexer = new Lexer(allTokens)

export class LlamaScriptParser extends CstParser {
	public script: any
	public statement: any
	public assignment: any
	public highlightStmt: any //TODO: implement highlights at chart component
	public expression: any
	public logicalExpression: any
	public comparisonExpression: any
	public additiveExpression: any
	public multiplicativeExpression: any
	public unaryExpression: any
	public primary: any
	public args: any
	public arrayElements: any

	constructor() {
		super(allTokens, { recoveryEnabled: true })
		const $ = this

		$.RULE('script', () => {
			$.MANY(() => {
				$.SUBRULE($.statement)
			})
			$.CONSUME(EOF)
		})

		$.RULE('statement', () => {
			$.OR([
				{ ALT: () => $.SUBRULE($.assignment) },
				// { ALT: () => $.SUBRULE($.highlightStmt) }, //TODO: implement highlights at chart component
				{ ALT: () => $.SUBRULE($.expression) }
			])
		})

		$.RULE('assignment', () => {
			$.CONSUME(Identifier)
			$.CONSUME(Assign)
			$.SUBRULE($.expression)
		})

		$.RULE('highlightStmt', () => {
			// $.CONSUME(Highlight)
			$.CONSUME(LParen)
			$.OPTION(() => {
				$.SUBRULE($.args)
			})
			$.CONSUME(RParen)
		})

		$.RULE('expression', () => {
			$.SUBRULE($.logicalExpression)
		})

		$.RULE('logicalExpression', () => {
			$.SUBRULE($.comparisonExpression)
			$.MANY(() => {
				$.OR([{ ALT: () => $.CONSUME(And) }, { ALT: () => $.CONSUME(Or) }])
				$.SUBRULE2($.comparisonExpression)
			})
		})

		$.RULE('comparisonExpression', () => {
			$.SUBRULE($.additiveExpression)
			$.MANY(() => {
				$.OR([
					{ ALT: () => $.CONSUME(Eq) },
					{ ALT: () => $.CONSUME(Neq) },
					{ ALT: () => $.CONSUME(Gte) },
					{ ALT: () => $.CONSUME(Lte) },
					{ ALT: () => $.CONSUME(Gt) },
					{ ALT: () => $.CONSUME(Lt) }
				])
				$.SUBRULE2($.additiveExpression)
			})
		})

		$.RULE('additiveExpression', () => {
			$.SUBRULE($.multiplicativeExpression)
			$.MANY(() => {
				$.OR([{ ALT: () => $.CONSUME(Plus) }, { ALT: () => $.CONSUME(Minus) }])
				$.SUBRULE2($.multiplicativeExpression)
			})
		})

		$.RULE('multiplicativeExpression', () => {
			$.SUBRULE($.unaryExpression)
			$.MANY(() => {
				$.OR([{ ALT: () => $.CONSUME(Mult) }, { ALT: () => $.CONSUME(Div) }])
				$.SUBRULE2($.unaryExpression)
			})
		})

		$.RULE('unaryExpression', () => {
			$.OR([
				{
					ALT: () => {
						$.OR2([{ ALT: () => $.CONSUME(Minus) }, { ALT: () => $.CONSUME(Not) }])
						$.SUBRULE($.unaryExpression)
					}
				},
				{ ALT: () => $.SUBRULE($.primary) }
			])
		})

		$.RULE('primary', () => {
			$.OR([
				{ ALT: () => $.CONSUME(NumberLiteral) },
				{ ALT: () => $.CONSUME(StringLiteral) },
				{ ALT: () => $.CONSUME(TrueLiteral) },
				{ ALT: () => $.CONSUME(FalseLiteral) },
				{
					ALT: () => {
						$.CONSUME(Identifier)
						$.OPTION(() => {
							$.CONSUME(LParen)
							$.OPTION2(() => {
								$.SUBRULE($.args)
							})
							$.CONSUME(RParen)
						})
					}
				},
				{
					ALT: () => {
						$.CONSUME(Plot)
						$.OPTION3(() => {
							$.CONSUME2(LParen)
							$.OPTION4(() => {
								$.SUBRULE2($.args)
							})
							$.CONSUME2(RParen)
						})
					}
				},
				{
					ALT: () => {
						$.CONSUME3(LParen)
						$.SUBRULE3($.expression)
						$.CONSUME3(RParen)
					}
				},
				{
					ALT: () => {
						$.CONSUME(LBracket)
						$.OPTION5(() => {
							$.SUBRULE($.arrayElements)
						})
						$.CONSUME(RBracket)
					}
				}
			])
			$.MANY(() => {
				$.CONSUME(Dot)
				$.CONSUME2(Identifier)
			})
		})

		$.RULE('args', () => {
			$.SUBRULE($.expression)
			$.MANY(() => {
				$.CONSUME(Comma)
				$.SUBRULE2($.expression)
			})
		})

		$.RULE('arrayElements', () => {
			$.SUBRULE($.expression)
			$.MANY(() => {
				$.CONSUME(Comma)
				$.SUBRULE2($.expression)
			})
		})

		this.performSelfAnalysis()
	}
}

;(LlamaScriptParser.prototype as any).script = undefined
;(LlamaScriptParser.prototype as any).statement = undefined
;(LlamaScriptParser.prototype as any).assignment = undefined
;(LlamaScriptParser.prototype as any).highlightStmt = undefined //TODO: implement highlights at chart component
;(LlamaScriptParser.prototype as any).expression = undefined
;(LlamaScriptParser.prototype as any).logicalExpression = undefined
;(LlamaScriptParser.prototype as any).comparisonExpression = undefined
;(LlamaScriptParser.prototype as any).additiveExpression = undefined
;(LlamaScriptParser.prototype as any).multiplicativeExpression = undefined
;(LlamaScriptParser.prototype as any).unaryExpression = undefined
;(LlamaScriptParser.prototype as any).primary = undefined
;(LlamaScriptParser.prototype as any).args = undefined
;(LlamaScriptParser.prototype as any).arrayElements = undefined

export function parseLlamaScript(input: string): { cst: CstNode | undefined; lexErrors: any[]; parseErrors: any[] } {
	const lexResult = LlamaScriptLexer.tokenize(input)
	const parser = new LlamaScriptParser()
	parser.input = lexResult.tokens
	const cst = parser.script()
	return {
		cst,
		lexErrors: lexResult.errors,
		parseErrors: parser.errors
	}
}

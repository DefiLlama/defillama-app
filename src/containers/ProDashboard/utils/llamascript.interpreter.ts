import type { CstNode } from 'chevrotain'
import ProtocolCharts from '../services/ProtocolCharts'
import ChainCharts from '../services/ChainCharts'

export interface LlamaScriptContext {
	variables: Record<string, any>
	plots: any[]
	highlights: any[] //TODO: implement highlights at chart component
	errors: string[]
	cache: Record<string, any>
}

function elementwiseOp(
	a: [number, number][] | number,
	b: [number, number][] | number,
	op: (x: number, y: number) => number
): [number, number][] {
	if (Array.isArray(a) && Array.isArray(b)) {
		const mapA = new Map(a.map(([t, v]) => [t, v]))
		const mapB = new Map(b.map(([t, v]) => [t, v]))
		const timestamps = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort((x, y) => x - y)
		const result = timestamps.map((ts) => [ts, op(mapA.get(ts) ?? 0, mapB.get(ts) ?? 0)] as [number, number])
		return result
	}
	if (Array.isArray(a) && typeof b === 'number') {
		const result = a.map(([t, v]) => [t, op(v, b)] as [number, number])
		return result
	}
	if (typeof a === 'number' && Array.isArray(b)) {
		const result = b.map(([t, v]) => [t, op(a, v)] as [number, number])
		return result
	}
	if (typeof a === 'number' && typeof b === 'number') {
		const result: [number, number][] = [[Math.floor(Date.now() / 1000), op(a, b)]]
		return result
	}
	return []
}

const PROPERTY_MAPPINGS = {
	protocol: {
		tvl: (id: string) => ProtocolCharts.tvl(id),
		volume: (id: string) => ProtocolCharts.volume(id),
		fees: (id: string) => ProtocolCharts.fees(id),
		revenue: (id: string) => ProtocolCharts.revenue(id),
		mcap: (id: string) => ProtocolCharts.tokenMcap('', id),
		price: (id: string) => ProtocolCharts.tokenPrice('', id),
		medianApy: (id: string) => ProtocolCharts.medianApy(id)
	},
	chain: {
		tvl: (id: string) => ChainCharts.tvl(id),
		volume: (id: string) => ChainCharts.volume(id),
		fees: (id: string) => ChainCharts.fees(id),
		users: (id: string) => ChainCharts.users(id),
		txs: (id: string) => ChainCharts.txs(id),
		aggregators: (id: string) => ChainCharts.aggregators(id),
		perps: (id: string) => ChainCharts.perps(id),
		bridgeAggregators: (id: string) => ChainCharts.bridgeAggregators(id),
		perpsAggregators: (id: string) => ChainCharts.perpsAggregators(id),
		options: (id: string) => ChainCharts.options(id),
		revenue: (id: string) => ChainCharts.revenue(id),
		bribes: (id: string) => ChainCharts.bribes(id),
		tokenTax: (id: string) => ChainCharts.tokenTax(id),
		activeUsers: (id: string) => ChainCharts.activeUsers(id),
		newUsers: (id: string) => ChainCharts.newUsers(id),
		gasUsed: (id: string) => ChainCharts.gasUsed(id)
	},
	token: {
		price: (id: string) => ProtocolCharts.tokenPrice('', id),
		volume: (id: string) => ProtocolCharts.tokenVolume('', id),
		marketCap: (id: string) => ProtocolCharts.tokenMcap('', id)
	}
} as const

// Utility to resolve a value, throwing if it's an entity (protocol/chain/token) used as a value
function resolveValue(val: any, context: LlamaScriptContext, varName?: string): any {
	if (
		val &&
		typeof val === 'object' &&
		'__llamaType' in val &&
		'id' in val &&
		!Array.isArray(val) &&
		typeof val !== 'number' &&
		typeof val !== 'string'
	) {
		context.errors.push(
			`Variable${
				varName ? ` '${varName}'` : ''
			} is a ${val.__llamaType.toUpperCase()} entity but no data property (e.g. .tvl, .volume) was selected. Please select a property.`
		)
		return undefined
	}
	return val
}

async function evaluatePrimaryWithProperties(exprNode: any, context: LlamaScriptContext): Promise<any> {
	let base = await evaluateExpression(getBaseExpression(exprNode), context)

	if (exprNode.children.Dot && exprNode.children.Identifier && exprNode.children.Identifier.length > 1) {
		for (let i = 1; i < exprNode.children.Identifier.length; i++) {
			const prop = exprNode.children.Identifier[i].image
			base = await evaluateProperty(base, prop, context)
			if (base === undefined) break
		}
	}

	return base
}

function getBaseExpression(exprNode: any): any {
	if (exprNode.children.Identifier && exprNode.children.LParen && exprNode.children.RParen) {
		return {
			children: {
				Identifier: [exprNode.children.Identifier[0]],
				LParen: exprNode.children.LParen,
				args: exprNode.children.args,
				RParen: exprNode.children.RParen
			}
		}
	}

	if (exprNode.children.Identifier && !exprNode.children.LParen) {
		return {
			children: {
				Identifier: [exprNode.children.Identifier[0]]
			}
		}
	}

	return exprNode
}

async function evaluateProperty(base: any, prop: string, context: LlamaScriptContext): Promise<any> {
	if (base && base.__llamaType) {
		const typeMapping = PROPERTY_MAPPINGS[base.__llamaType as keyof typeof PROPERTY_MAPPINGS]
		if (typeMapping && prop in typeMapping) {
			const cacheKey = `${base.id}-${prop}`
			if (context.cache[cacheKey] !== undefined) {
				return context.cache[cacheKey]
			}
			const result = await typeMapping[prop as keyof typeof typeMapping](base.id)
			context.cache[cacheKey] = result
			return result
		} else {
			context.errors.push(`Property ${prop} not found on ${base.__llamaType.toUpperCase()}(${base.id})`)
			return undefined
		}
	}

	if (base && typeof base === 'object' && prop in base) {
		return base[prop]
	}

	context.errors.push(`Property ${prop} not found`)
	return undefined
}

function isValidColor(str: string): boolean {
	if (!str || typeof str !== 'string') return false
	if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(str)) return true
	const s = document.createElement('span').style
	s.color = str
	return !!s.color
}

async function evaluateExpression(exprNode: any, context: LlamaScriptContext): Promise<any> {
	if (!exprNode || typeof exprNode !== 'object' || !('children' in exprNode)) return undefined

	if (
		exprNode.children &&
		exprNode.children.Dot &&
		exprNode.children.Identifier &&
		exprNode.children.Identifier.length > 1
	) {
		return evaluatePrimaryWithProperties(exprNode, context)
	}

	if (exprNode.children.LParen && exprNode.children.expression && exprNode.children.RParen) {
		return evaluateExpression(exprNode.children.expression[0], context)
	}

	if (exprNode.name === 'additiveExpression') {
		let left = await evaluateExpression(exprNode.children.multiplicativeExpression[0], context)
		if (exprNode.children.Plus || exprNode.children.Minus) {
			for (let i = 0; i < (exprNode.children.Plus?.length || 0) + (exprNode.children.Minus?.length || 0); i++) {
				const opToken = exprNode.children.Plus && exprNode.children.Plus[i] ? '+' : '-'
				let right = await evaluateExpression(exprNode.children.multiplicativeExpression[i + 1], context)
				right = resolveValue(right, context)
				left = elementwiseOp(left, right, opToken === '+' ? (a, b) => a + b : (a, b) => a - b)
			}
		}
		return left
	}
	if (exprNode.name === 'multiplicativeExpression') {
		let left = await evaluateExpression(exprNode.children.unaryExpression[0], context)
		if (exprNode.children.Mult || exprNode.children.Div) {
			for (let i = 0; i < (exprNode.children.Mult?.length || 0) + (exprNode.children.Div?.length || 0); i++) {
				const opToken = exprNode.children.Mult && exprNode.children.Mult[i] ? '*' : '/'
				let right = await evaluateExpression(exprNode.children.unaryExpression[i + 1], context)
				right = resolveValue(right, context)
				left = elementwiseOp(left, right, opToken === '*' ? (a, b) => a * b : (a, b) => (b === 0 ? 0 : a / b))
			}
		}
		return left
	}

	if (exprNode.children.LBracket && exprNode.children.RBracket) {
		const elements: any[] = []
		if (exprNode.children.arrayElements) {
			const arrNode = exprNode.children.arrayElements[0]
			if (arrNode.children.expression) {
				for (const expr of arrNode.children.expression) {
					elements.push(await evaluateExpression(expr, context))
				}
			}
		}
		return elements
	}

	if (exprNode.children.Identifier && exprNode.children.LParen && exprNode.children.RParen) {
		let funcName = exprNode.children.Identifier[0].image
		if (typeof funcName === 'string') funcName = funcName.toLowerCase()
		const argsNode = exprNode.children.args?.[0]
		const args = argsNode?.children.expression
			? await Promise.all(argsNode.children.expression.map((arg: any) => evaluateExpression(arg, context)))
			: []

		if (funcName === 'token') {
			const tokenId = args[0]
			if (typeof tokenId === 'string') {
				return { __llamaType: 'token', id: tokenId }
			}
			context.errors.push(`Invalid TOKEN argument: ${tokenId}`)
			return undefined
		}
		if (funcName === 'protocol') {
			const protocolId = args[0]
			if (typeof protocolId === 'string') {
				return { __llamaType: 'protocol', id: protocolId }
			}
			context.errors.push(`Invalid PROTOCOL argument: ${protocolId}`)
			return undefined
		}
		if (funcName === 'chain') {
			const chainId = args[0]
			if (typeof chainId === 'string') {
				return { __llamaType: 'chain', id: chainId }
			}
			context.errors.push(`Invalid CHAIN argument: ${chainId}`)
			return undefined
		}

		if (funcName === 'ma' || funcName === 'ema') {
			const series = args[0]
			const window = args[1] || args[0]?.window || 14
			if (!Array.isArray(series)) {
				context.errors.push(`${funcName.toUpperCase()} expects a series as first argument`)
				return undefined
			}
			if (typeof window !== 'number' || window < 1) {
				context.errors.push(`${funcName.toUpperCase()} expects a positive integer window`)
				return undefined
			}
			if (funcName === 'ma') {
				const result = series.map((_, i, arr) => {
					if (i < window - 1) return [arr[i][0], null]
					const slice = arr.slice(i - window + 1, i + 1)
					const mean = slice.reduce((sum, [, v]) => sum + (v ?? 0), 0) / window
					return [arr[i][0], mean]
				})
				return result
			}
			if (funcName === 'ema') {
				const alpha = 2 / (window + 1)
				let prev = series[0][1]
				const result = series.map(([t, v], i) => {
					if (i === 0) return [t, v]
					const ema = alpha * v + (1 - alpha) * (prev ?? v)
					prev = ema
					return [t, ema]
				})
				return result
			}
		}
		if (funcName === 'diff') {
			const series = args[0]
			if (!Array.isArray(series)) {
				context.errors.push('diff() expects a series')
				return undefined
			}
			const result = series.map(([t, v], i, arr) => [t, i === 0 ? null : v - arr[i - 1][1]])
			return result
		}
		if (funcName === 'abs') {
			const series = args[0]
			if (!Array.isArray(series)) {
				context.errors.push('abs() expects a series')
				return undefined
			}
			const result = series.map(([t, v]) => [t, Math.abs(v)])
			return result
		}
		if (funcName === 'pctchange') {
			const series = args[0]
			if (!Array.isArray(series)) {
				context.errors.push('pctChange() expects a series')
				return undefined
			}
			const result = series.map(([t, v], i, arr) => [
				t,
				i === 0 ? null : ((v - arr[i - 1][1]) / (arr[i - 1][1] || 1)) * 100
			])
			return result
		}
		if (funcName === 'if') {
			const [condition, thenVal, elseVal] = args
			if (Array.isArray(condition)) {
				return condition.map(([t, cond], i) => [
					t,
					cond
						? Array.isArray(thenVal)
							? thenVal[i]?.[1]
							: thenVal
						: Array.isArray(elseVal)
						? elseVal[i]?.[1]
						: elseVal
				])
			} else {
				return [[Math.floor(Date.now() / 1000), condition ? thenVal : elseVal]]
			}
		}
	}

	if (exprNode.name === 'comparisonExpression') {
		let left = await evaluateExpression(exprNode.children.additiveExpression[0], context)
		if (
			exprNode.children.Eq ||
			exprNode.children.Neq ||
			exprNode.children.Gte ||
			exprNode.children.Lte ||
			exprNode.children.Gt ||
			exprNode.children.Lt
		) {
			const ops = ['Eq', 'Neq', 'Gte', 'Lte', 'Gt', 'Lt']
			for (let i = 0; i < ops.length; i++) {
				const op = ops[i]
				if (exprNode.children[op]) {
					let right = await evaluateExpression(exprNode.children.additiveExpression[1], context)
					right = resolveValue(right, context)
					const opMap: Record<string, (a: number, b: number) => boolean> = {
						Eq: (a, b) => a === b,
						Neq: (a, b) => a !== b,
						Gte: (a, b) => a >= b,
						Lte: (a, b) => a <= b,
						Gt: (a, b) => a > b,
						Lt: (a, b) => a < b
					}
					if (Array.isArray(left) && Array.isArray(right)) {
						return left.map(([t, v], idx) => [t, opMap[op](v, right[idx][1])])
					} else if (Array.isArray(left)) {
						return left.map(([t, v]) => [t, opMap[op](v, right)])
					} else if (Array.isArray(right)) {
						return right.map(([t, v]) => [t, opMap[op](left, v)])
					} else {
						return [[Math.floor(Date.now() / 1000), opMap[op](left, right)]]
					}
				}
			}
		}
		return left
	}

	if (exprNode.name === 'logicalExpression') {
		let left = await evaluateExpression(exprNode.children.comparisonExpression[0], context)
		if (exprNode.children.And || exprNode.children.Or) {
			for (let i = 0; i < (exprNode.children.And?.length || 0) + (exprNode.children.Or?.length || 0); i++) {
				const isAnd = exprNode.children.And && exprNode.children.And[i]
				let right = await evaluateExpression(exprNode.children.comparisonExpression[i + 1], context)
				right = resolveValue(right, context)
				if (Array.isArray(left) && Array.isArray(right)) {
					left = left.map(([t, v], idx) => [t, isAnd ? v && right[idx][1] : v || right[idx][1]])
				} else if (Array.isArray(left)) {
					left = left.map(([t, v]) => [t, isAnd ? v && right : v || right])
				} else if (Array.isArray(right)) {
					left = right.map(([t, v]) => [t, isAnd ? left && v : left || v])
				} else {
					left = [[Math.floor(Date.now() / 1000), isAnd ? left && right : left || right]]
				}
			}
		}
		return left
	}

	if (exprNode.name === 'unaryExpression' && exprNode.children.Not) {
		const val = await evaluateExpression(exprNode.children.unaryExpression[0], context)
		if (Array.isArray(val)) {
			return val.map(([t, v]) => [t, !v])
		} else {
			return [[Math.floor(Date.now() / 1000), !val]]
		}
	}

	if (exprNode.name === 'expression' && exprNode.children.logicalExpression) {
		return evaluateExpression(exprNode.children.logicalExpression[0], context)
	}
	if (exprNode.name === 'logicalExpression' && exprNode.children.comparisonExpression) {
		return evaluateExpression(exprNode.children.comparisonExpression[0], context)
	}
	if (exprNode.name === 'comparisonExpression' && exprNode.children.additiveExpression) {
		return evaluateExpression(exprNode.children.additiveExpression[0], context)
	}
	if (exprNode.name === 'unaryExpression' && exprNode.children.primary) {
		return evaluateExpression(exprNode.children.primary[0], context)
	}

	if (exprNode.children.NumberLiteral && exprNode.children.NumberLiteral[0]) {
		return parseFloat(exprNode.children.NumberLiteral[0].image)
	}
	if (exprNode.children.StringLiteral && exprNode.children.StringLiteral[0]) {
		const raw = exprNode.children.StringLiteral[0].image
		return raw.slice(1, -1)
	}
	if (exprNode.children.TrueLiteral && exprNode.children.TrueLiteral[0]) {
		return true
	}
	if (exprNode.children.FalseLiteral && exprNode.children.FalseLiteral[0]) {
		return false
	}
	if (
		exprNode.children.Identifier &&
		exprNode.children.Identifier[0] &&
		!exprNode.children.LParen &&
		!exprNode.children.RParen
	) {
		const varName = exprNode.children.Identifier[0].image
		if (varName === 'null') {
			return null
		}
		if (context.variables[varName] !== undefined) {
			return context.variables[varName]
		} else {
			context.errors.push(`Undefined variable: ${varName}`)
			return undefined
		}
	}

	context.errors.push('Unsupported expression node encountered.')
	return undefined
}

function isCstNode(node: any): node is { children: any } {
	return node && typeof node === 'object' && 'children' in node && node.children !== undefined
}

export async function interpretLlamaScriptCST(cst: CstNode): Promise<LlamaScriptContext> {
	const context: LlamaScriptContext = {
		variables: {},
		plots: [],
		highlights: [],
		errors: [],
		cache: {}
	}

	function getFirstTokenImage(node: any, tokenName: string): string | undefined {
		if (!node || typeof node !== 'object' || !('children' in node)) return undefined
		const arr = node.children[tokenName]
		if (Array.isArray(arr) && arr[0] && arr[0].image) return arr[0].image
		return undefined
	}

	if (cst && cst.name === 'script' && Array.isArray(cst.children.statement)) {
		for (const stmt of cst.children.statement) {
			if (!stmt || typeof stmt !== 'object' || !('children' in stmt)) continue
			const keys = Object.keys(stmt.children)
			if (keys.length === 0) continue
			const node = stmt.children[keys[0]][0]
			if (!node || typeof node !== 'object' || !('name' in node)) continue
			try {
				if (node.name === 'assignment') {
					const varName = getFirstTokenImage(node, 'Identifier')
					let value = undefined
					if (node.children.expression && node.children.expression[0]) {
						value = await evaluateExpression(node.children.expression[0], context)
					}
					context.variables[varName || 'unknown'] = value
				} else if (node.name === 'highlightStmt') {
					let args: any[] = []
					let evalArgs: any[] = []
					if (node.children && node.children.args && Array.isArray(node.children.args)) {
						const argsNode = node.children.args[0]
						if (isCstNode(argsNode) && argsNode.children.expression) {
							args = argsNode.children.expression
							evalArgs = await Promise.all(args.map((arg: any) => evaluateExpression(arg, context)))
						}
					}
					context.highlights.push({ type: 'highlight', raw: node, args, evalArgs })
				} else if (node.name === 'expression') {
					const logicalExpr = node.children.logicalExpression?.[0]
					if (isCstNode(logicalExpr) && logicalExpr.children?.comparisonExpression) {
						const comparisonExpr = logicalExpr.children.comparisonExpression[0]
						if (isCstNode(comparisonExpr) && comparisonExpr.children?.additiveExpression) {
							const addExpr = comparisonExpr.children.additiveExpression[0]
							if (isCstNode(addExpr) && addExpr.children?.multiplicativeExpression) {
								const mulExpr = addExpr.children.multiplicativeExpression[0]
								if (isCstNode(mulExpr) && mulExpr.children?.unaryExpression) {
									const unaryExpr = mulExpr.children.unaryExpression[0]
									if (isCstNode(unaryExpr) && unaryExpr.children?.primary) {
										const primary = unaryExpr.children.primary[0]
										if (isCstNode(primary)) {
											const funcName = getFirstTokenImage(primary, 'Plot') || getFirstTokenImage(primary, 'Identifier')
											const funcNameLower = funcName && typeof funcName === 'string' ? funcName.toLowerCase() : funcName
											if (funcNameLower === 'plot') {
												let args = []
												let evalArgs = []
												if (primary.children && primary.children.args && Array.isArray(primary.children.args)) {
													const argsNode = primary.children.args[0]
													if (isCstNode(argsNode) && argsNode.children.expression) {
														args = argsNode.children.expression
														evalArgs = await Promise.all(args.map((arg: any) => evaluateExpression(arg, context)))
														evalArgs = evalArgs.map((val, idx) => resolveValue(val, context))
													}
												}
												if (evalArgs.length > 0 && Array.isArray(evalArgs[0]) && evalArgs[0].length === 0) {
													context.errors.push(
														'The data series for the plot is empty or unavailable. Please check your data source.'
													)
													continue
												}
												let label = undefined
												let chartType = undefined
												let color = undefined
												let dashed = undefined
												let group = undefined
												if (evalArgs.length > 1 && typeof evalArgs[1] === 'string') label = evalArgs[1]
												if (evalArgs.length > 2 && typeof evalArgs[2] === 'string') chartType = evalArgs[2]
												if (chartType && chartType !== 'area' && chartType !== 'bar') {
													context.errors.push(`Only 'area' and 'bar' chart types are supported. Got: ${chartType}`)
													chartType = 'area'
												}
												if (evalArgs.length > 3 && typeof evalArgs[3] === 'string') {
													if (isValidColor(evalArgs[3])) {
														color = evalArgs[3]
													} else {
														context.errors.push(`Invalid color: ${evalArgs[3]}`)
														color = undefined
													}
												}
												if (evalArgs.length > 4) dashed = evalArgs[4]
												if (evalArgs.length > 5) group = evalArgs[5]
												context.plots.push({
													type: 'plot',
													raw: primary,
													args,
													evalArgs,
													label,
													chartType,
													color,
													dashed,
													group
												})
											}
										}
									}
								}
							}
						}
					}
				} else {
					context.errors.push(`Unsupported statement type: ${node.name}`)
				}
			} catch (err: any) {
				context.errors.push(`Interpreter error: ${err?.message || err}`)
			}
		}
	}

	return context
}

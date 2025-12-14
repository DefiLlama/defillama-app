import { Parser } from 'expr-eval'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { formattedNum, formattedPercent } from '~/utils'
import type { CustomColumnDefinition } from '../../../types'
import type { NormalizedRow, NumericMetrics } from '../types'
import { UNIFIED_TABLE_COLUMN_DICTIONARY } from '../config/ColumnDictionary'
import { getAggregationContextFromLeafRows } from '../core/groupingUtils'

const parser = new Parser()

const EXPR_CACHE_MAX_SIZE = 100
const expressionCache = new Map<string, ReturnType<typeof parser.parse>>()

function getParsedExpression(expression: string): ReturnType<typeof parser.parse> | null {
	const cached = expressionCache.get(expression)
	if (cached) return cached

	try {
		const parsed = parser.parse(expression)
		if (expressionCache.size >= EXPR_CACHE_MAX_SIZE) {
			const firstKey = expressionCache.keys().next().value
			if (firstKey) expressionCache.delete(firstKey)
		}
		expressionCache.set(expression, parsed)
		return parsed
	} catch {
		return null
	}
}

const renderDash = () => <span className="pro-text3">-</span>

const renderUsd = (value: number | null | undefined) => {
	if (value === null || value === undefined) return renderDash()
	return <span className="pro-text2">{formattedNum(value, true)}</span>
}

const renderNumber = (value: number | null | undefined) => {
	if (value === null || value === undefined) return renderDash()
	return <span className="pro-text2">{formattedNum(value, false)}</span>
}

const renderPercent = (value: number | null | undefined) => {
	if (value === null || value === undefined) return renderDash()
	return <span className="pro-text2">{formattedPercent(value, true)}</span>
}

const renderRatio = (value: number | null | undefined) => {
	if (value === null || value === undefined) return renderDash()
	return <span className="pro-text2">{`${formattedNum(value, false)}x`}</span>
}

const numericSorting = (a: number | null | undefined, b: number | null | undefined) => {
	if (a === null || a === undefined) {
		return b === null || b === undefined ? 0 : -1
	}
	if (b === null || b === undefined) {
		return 1
	}
	return a - b
}

export function generateCustomColumnId(): string {
	return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function isCustomColumnId(id: string): boolean {
	return id.startsWith('custom_')
}

export function getOrderedCustomColumnIds(columnOrder: string[], customColumns: CustomColumnDefinition[]): string[] {
	const validCustomIds = new Set(customColumns.map((c) => c.id))
	const idsFromOrder = columnOrder.filter((id) => isCustomColumnId(id) && validCustomIds.has(id))
	const seen = new Set(idsFromOrder)

	for (const { id } of customColumns) {
		if (seen.has(id)) continue
		idsFromOrder.push(id)
		seen.add(id)
	}

	return idsFromOrder
}

export function getExpressionVariables(expression: string): string[] {
	const expr = getParsedExpression(expression)
	if (!expr) return []
	return expr.variables()
}

export function validateExpression(expression: string): { isValid: boolean; error?: string } {
	if (!expression || !expression.trim()) {
		return { isValid: false, error: 'Expression cannot be empty' }
	}

	const expr = getParsedExpression(expression)
	if (!expr) {
		return { isValid: false, error: 'Invalid expression syntax' }
	}

	try {
		const usedVars = expr.variables()
		const availableVars = getAvailableVariables()
		const availableKeys = new Set(availableVars.map((v) => v.key))

		const unknownVars = usedVars.filter((v) => !availableKeys.has(v))
		if (unknownVars.length > 0) {
			return { isValid: false, error: `Unknown variable${unknownVars.length > 1 ? 's' : ''}: ${unknownVars.join(', ')}` }
		}

		const testContext: Record<string, number> = {}
		for (const v of availableVars) {
			testContext[v.key] = 100
		}
		expr.evaluate(testContext)
		return { isValid: true }
	} catch (e: any) {
		return { isValid: false, error: e.message || 'Invalid expression' }
	}
}

export function validateCustomColumnOnLoad(def: CustomColumnDefinition): { isValid: boolean; error?: string } {
	if (!def.expression) {
		return { isValid: false, error: 'Missing expression' }
	}
	return validateExpression(def.expression)
}

export function evaluateExpression(expression: string, metrics: NumericMetrics): number | null {
	const expr = getParsedExpression(expression)
	if (!expr) return null

	try {
		const usedVars = expr.variables()

		for (const varName of usedVars) {
			const value = metrics[varName as keyof NumericMetrics]
			if (value === null || value === undefined) {
				return null
			}
		}

		const context: Record<string, number> = {}
		for (const [key, value] of Object.entries(metrics)) {
			if (typeof value === 'number' && !Number.isNaN(value)) {
				context[key] = value
			}
		}

		const result = expr.evaluate(context)
		if (typeof result === 'number' && !Number.isNaN(result) && Number.isFinite(result)) {
			return result
		}
		return null
	} catch {
		return null
	}
}

export interface AvailableVariable {
	key: string
	name: string
	group: string
	format: CustomColumnDefinition['format']
}

let ALL_VARIABLES_CACHE: AvailableVariable[] | null = null

function getAllVariables(): AvailableVariable[] {
	if (ALL_VARIABLES_CACHE) return ALL_VARIABLES_CACHE

	ALL_VARIABLES_CACHE = UNIFIED_TABLE_COLUMN_DICTIONARY.filter((col) => col.group !== 'meta').map((col) => ({
		key: col.id,
		name: col.header,
		group: col.group,
		format:
			col.render === 'usd' || col.render === 'percent' || col.render === 'ratio' || col.render === 'number'
				? col.render
				: 'number'
	}))
	return ALL_VARIABLES_CACHE
}

export interface GetAvailableVariablesOptions {
	groups?: string[]
	keys?: string[]
}

export function getAvailableVariables(options?: GetAvailableVariablesOptions): AvailableVariable[] {
	const all = getAllVariables()
	if (!options) return all

	const { groups, keys } = options
	const groupSet = groups ? new Set(groups) : null
	const keySet = keys ? new Set(keys) : null

	return all.filter((v) => {
		if (groupSet && !groupSet.has(v.group)) return false
		if (keySet && !keySet.has(v.key)) return false
		return true
	})
}

export const SAMPLE_METRICS: NumericMetrics = {
	tvl: 1_500_000_000,
	change1d: 1.35,
	change7d: 7.14,
	change1m: 25.0,
	bridgedTvl: 800_000_000,
	stablesMcap: 500_000_000,
	tvlShare: 12.5,
	stablesShare: 8.2,

	volume24h: 50_000_000,
	volume_7d: 350_000_000,
	volume_30d: 1_500_000_000,
	cumulativeVolume: 50_000_000_000,
	volumeChange_1d: 5.2,
	volumeChange_7d: 12.8,
	volumeChange_1m: -3.5,
	volumeDominance_24h: 8.5,
	volumeMarketShare7d: 7.2,
	volume24hShare: 15.3,

	fees24h: 250_000,
	fees_7d: 1_750_000,
	fees_30d: 7_500_000,
	fees_1y: 90_000_000,
	average_1y: 7_500_000,
	cumulativeFees: 500_000_000,
	userFees_24h: 200_000,
	holderRevenue_24h: 50_000,
	holderRevenue_7d: 350_000,
	holdersRevenue30d: 1_500_000,
	treasuryRevenue_24h: 25_000,
	feesChange_1d: 3.2,
	feesChange_7d: 8.5,
	feesChange_1m: 15.0,

	revenue24h: 150_000,
	revenue_7d: 1_050_000,
	revenue_30d: 4_500_000,
	revenue_1y: 54_000_000,
	average_revenue_1y: 4_500_000,
	revenueChange_1d: 2.8,
	revenueChange_7d: 6.3,
	revenueChange_1m: 12.0,

	perpsVolume24h: 20_000_000,
	perps_volume_7d: 140_000_000,
	perps_volume_30d: 600_000_000,
	perps_volume_change_1d: 4.5,
	perps_volume_change_7d: 10.2,
	perps_volume_change_1m: -2.1,
	perps_volume_dominance_24h: 5.8,
	openInterest: 100_000_000,

	aggregators_volume_24h: 15_000_000,
	aggregators_volume_7d: 105_000_000,
	aggregators_volume_30d: 450_000_000,
	aggregators_volume_change_1d: 6.1,
	aggregators_volume_change_7d: 14.3,
	aggregators_volume_dominance_24h: 3.2,
	aggregators_volume_marketShare7d: 2.8,

	derivatives_aggregators_volume_24h: 8_000_000,
	derivatives_aggregators_volume_7d: 56_000_000,
	derivatives_aggregators_volume_30d: 240_000_000,
	derivatives_aggregators_volume_change_1d: 7.2,
	derivatives_aggregators_volume_change_7d: 11.5,
	derivatives_aggregators_volume_change_1m: 18.0,

	options_volume_24h: 5_000_000,
	options_volume_7d: 35_000_000,
	options_volume_30d: 150_000_000,
	options_volume_change_1d: 8.3,
	options_volume_change_7d: 15.7,
	options_volume_dominance_24h: 2.1,

	mcap: 2_000_000_000,
	fdv: 3_000_000_000,
	mcaptvl: 1.33,
	pf: 22.0,
	ps: 36.5
}

export function evaluateWithSampleData(expression: string): { value: number | null; error?: string } {
	const validation = validateExpression(expression)
	if (!validation.isValid) {
		return { value: null, error: validation.error }
	}
	const value = evaluateExpression(expression, SAMPLE_METRICS)
	return { value }
}

const getRenderer = (format: CustomColumnDefinition['format']) => {
	switch (format) {
		case 'usd':
			return renderUsd
		case 'percent':
			return renderPercent
		case 'ratio':
			return renderRatio
		case 'number':
		default:
			return renderNumber
	}
}

const createAggregationFn = (def: CustomColumnDefinition) => {
	return (_columnId: string, leafRows: Row<NormalizedRow>[]): number | null => {
		if (!leafRows.length) return null

		switch (def.aggregation) {
			case 'none':
				return null

			case 'first': {
				const firstRow = leafRows[0]?.original
				if (!firstRow) return null
				return evaluateExpression(def.expression, firstRow.metrics)
			}

			case 'sum': {
				let sum = 0
				let hasValidValue = false
				for (const row of leafRows) {
					const value = evaluateExpression(def.expression, row.original.metrics)
					if (value !== null) {
						sum += value
						hasValidValue = true
					}
				}
				return hasValidValue ? sum : null
			}

			case 'recalculate':
			default: {
				const context = getAggregationContextFromLeafRows(leafRows)
				return evaluateExpression(def.expression, context.metrics)
			}
		}
	}
}

export function createCustomColumnDef(def: CustomColumnDefinition): ColumnDef<NormalizedRow> {
	const renderer = getRenderer(def.format)

	return {
		id: def.id,
		header: def.name,
		accessorFn: (row: NormalizedRow) => evaluateExpression(def.expression, row.metrics),
		meta: { align: 'end' as const },
		cell: (ctx) => {
			const value = ctx.getValue() as number | null
			return renderer(value)
		},
		sortingFn: (rowA: Row<NormalizedRow>, rowB: Row<NormalizedRow>, columnId: string) => {
			const a = rowA.getValue(columnId) as number | null | undefined
			const b = rowB.getValue(columnId) as number | null | undefined
			return numericSorting(a, b)
		},
		aggregationFn: createAggregationFn(def)
	}
}

export function formatPreviewNumber(
	value: number | null | undefined,
	format: CustomColumnDefinition['format'] = 'number'
): string {
	if (value === null || value === undefined) return '-'

	if (format === 'percent') {
		return `${value.toFixed(2)}%`
	}

	if (format === 'ratio') {
		return `${value.toFixed(2)}x`
	}

	const prefix = format === 'usd' ? '$' : ''

	if (Math.abs(value) >= 1e9) {
		return `${prefix}${(value / 1e9).toFixed(2)}B`
	} else if (Math.abs(value) >= 1e6) {
		return `${prefix}${(value / 1e6).toFixed(2)}M`
	} else if (Math.abs(value) >= 1e3) {
		return `${prefix}${(value / 1e3).toFixed(2)}K`
	} else if (Math.abs(value) < 1 && value !== 0) {
		return `${prefix}${value.toFixed(4)}`
	} else {
		return `${prefix}${value.toFixed(2)}`
	}
}

export function getDefaultAggregation(expression: string): CustomColumnDefinition['aggregation'] {
	const vars = getExpressionVariables(expression)
	const hasRatioVars = vars.some((v) => ['mcaptvl', 'pf', 'ps'].includes(v))
	const hasDivision = expression.includes('/')

	if (hasRatioVars || hasDivision) {
		return 'recalculate'
	}
	return 'sum'
}

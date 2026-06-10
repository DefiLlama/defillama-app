import { describe, expect, it } from 'vitest'
import {
	citedRowDate,
	findCitedCell,
	formatCellValue,
	formatDateValue,
	formatMetricValue,
	formatOutputValue,
	humanizeColumn,
	parseRefNumber
} from './citationPillHelpers'

describe('formatCellValue', () => {
	it('groups large integers with thousands separators', () => {
		expect(formatCellValue(11814381045)).toBe('11,814,381,045')
	})

	it('trims and rounds large floats to an integer with grouping', () => {
		expect(formatCellValue(Number('11814381044.867093220099'))).toBe('11,814,381,045')
	})

	it('keeps mid-magnitude floats readable with 2 decimals', () => {
		expect(formatCellValue(12.3456)).toBe('12.35')
	})

	it('keeps small decimals readable with up to 4 decimals', () => {
		expect(formatCellValue(0.8111111)).toBe('0.8111')
	})

	it('parses numeric strings', () => {
		expect(formatCellValue('9626500437.66')).toBe('9,626,500,438')
	})

	it('passes non-numeric strings through', () => {
		expect(formatCellValue('aave')).toBe('aave')
	})

	it('renders null and undefined as an em dash', () => {
		expect(formatCellValue(null)).toBe('—')
		expect(formatCellValue(undefined)).toBe('—')
	})

	it('renders empty string as an em dash', () => {
		expect(formatCellValue('   ')).toBe('—')
	})

	it('handles non-finite numbers', () => {
		expect(formatCellValue(Number.NaN)).toBe('NaN')
		expect(formatCellValue(Infinity)).toBe('Infinity')
	})
})

describe('parseRefNumber', () => {
	it('strips currency, commas and B suffix', () => {
		expect(parseRefNumber('$11.81B')).toBeCloseTo(11810000000, 0)
	})

	it('handles M and K suffixes', () => {
		expect(parseRefNumber('$5.2M')).toBeCloseTo(5200000, 0)
		expect(parseRefNumber('3.5K')).toBeCloseTo(3500, 0)
	})

	it('returns null for non-numeric input', () => {
		expect(parseRefNumber('lending')).toBeNull()
		expect(parseRefNumber('Uniswap V3')).toBeNull()
		expect(parseRefNumber('1inch')).toBeNull()
		expect(parseRefNumber('2024-05-01')).toBeNull()
		expect(parseRefNumber(null)).toBeNull()
	})

	it('parses negative currency strings', () => {
		expect(parseRefNumber('-$2.5M')).toBeCloseTo(-2500000, 0)
	})
})

describe('findCitedCell', () => {
	const rows = [
		{ protocol: 'aave', tvl_base: Number('11814381044.867093'), tvl_borrowed: 9626500437.66 },
		{ protocol: 'compound', tvl_base: 2000000000, tvl_borrowed: 500000000 }
	]
	const columns = ['protocol', 'tvl_base', 'tvl_borrowed']

	it('prefers the explicit field + rowIndex binding', () => {
		expect(findCitedCell(rows, columns, { field: 'tvl_borrowed', rowIndex: 0 })).toEqual({
			rowIndex: 0,
			column: 'tvl_borrowed'
		})
	})

	it('matches by value when no binding is present', () => {
		expect(findCitedCell(rows, columns, { value: '$11.81B' })).toEqual({
			rowIndex: 0,
			column: 'tvl_base'
		})
	})

	it('returns the first match when multiple cells match the value', () => {
		const dupRows = [
			{ a: 100, b: 200 },
			{ a: 100, b: 300 }
		]
		expect(findCitedCell(dupRows, ['a', 'b'], { value: '100' })).toEqual({ rowIndex: 0, column: 'a' })
	})

	it('uses a partial field binding before scanning unrelated columns', () => {
		const rankedRows = [
			{ rank: 5, apy: 1 },
			{ rank: 1, apy: 5 }
		]
		expect(findCitedCell(rankedRows, ['rank', 'apy'], { field: 'apy', value: '5' })).toEqual({
			rowIndex: 1,
			column: 'apy'
		})
	})

	it('does not treat date strings as numeric fallback matches', () => {
		expect(findCitedCell([{ date: '2024-05-01' }], ['date'], { value: '2024' })).toBeNull()
	})

	it('returns null when nothing matches', () => {
		expect(findCitedCell(rows, columns, { value: '$999B' })).toBeNull()
	})

	it('returns null for empty rows', () => {
		expect(findCitedCell([], columns, { field: 'tvl_base', rowIndex: 0 })).toBeNull()
		expect(findCitedCell(undefined, columns, { value: '100' })).toBeNull()
	})

	it('ignores an out-of-range or unknown binding and falls back to value match', () => {
		expect(findCitedCell(rows, columns, { field: 'missing_col', rowIndex: 0, value: '$11.81B' })).toEqual({
			rowIndex: 0,
			column: 'tvl_base'
		})
		expect(findCitedCell(rows, columns, { field: 'tvl_base', rowIndex: 99, value: '$11.81B' })).toEqual({
			rowIndex: 0,
			column: 'tvl_base'
		})
	})
})

describe('formatDateValue', () => {
	it('formats ISO date strings in UTC', () => {
		expect(formatDateValue('2025-10-06')).toBe('Oct 6, 2025')
		expect(formatDateValue('2025-10-06T12:30:00Z')).toBe('Oct 6, 2025')
	})

	it('formats epoch seconds and milliseconds', () => {
		expect(formatDateValue(1759708800)).toBe('Oct 6, 2025')
		expect(formatDateValue(1759708800000)).toBe('Oct 6, 2025')
	})

	it('returns null for unparseable or empty input', () => {
		expect(formatDateValue('not a date')).toBeNull()
		expect(formatDateValue('')).toBeNull()
		expect(formatDateValue(null)).toBeNull()
		expect(formatDateValue(undefined)).toBeNull()
	})
})

describe('citedRowDate', () => {
	it('reads the date column of the cited row', () => {
		const row = { protocol: 'btc', date: '2025-10-06', price: 124774 }
		expect(citedRowDate(row, ['protocol', 'date', 'price'])).toBe('Oct 6, 2025')
	})

	it('prefers the period column over loaded_at-style ingestion columns', () => {
		const row = { ts: '2025-10-06', as_of: '2026-06-16', price: 124774 }
		expect(citedRowDate(row, ['ts', 'as_of', 'price'])).toBe('Oct 6, 2025')
	})

	it('returns null when there is no date column', () => {
		expect(citedRowDate({ protocol: 'btc', price: 124774 }, ['protocol', 'price'])).toBeNull()
		expect(citedRowDate(undefined, ['date'])).toBeNull()
	})
})

describe('formatMetricValue', () => {
	it('prefixes USD metrics and abbreviates large magnitudes', () => {
		expect(formatMetricValue('price', 61537)).toBe('$61,537')
		expect(formatMetricValue('mcap', 1233518998762)).toBe('$1.23T')
		expect(formatMetricValue('volume', 31154779205)).toBe('$31.15B')
		expect(formatMetricValue('price_ath', 126156)).toBe('$126,156')
		expect(formatMetricValue('fees_30d', 5200000)).toBe('$5.2M')
	})

	it('handles negative USD values', () => {
		expect(formatMetricValue('revenue', -2500000)).toBe('-$2.5M')
	})

	it('suffixes already-percent metrics without scaling', () => {
		expect(formatMetricValue('pct_from_ath', -51.22)).toBe('-51.22%')
		expect(formatMetricValue('apy_base', 2.32)).toBe('2.32%')
	})

	it('scales decimal pct_change columns to percent', () => {
		expect(formatMetricValue('tvl_30d_pct_change', -0.1322)).toBe('-13.22%')
	})

	it('treats windowed _pct aliases as already ×100 in SQL, without re-scaling', () => {
		expect(formatMetricValue('tvl_30d_pct', 34.28)).toBe('34.28%')
		expect(formatMetricValue('tvl_7d_pct', -1.91)).toBe('-1.91%')
		expect(formatMetricValue('mcap_7d_pct', 5)).toBe('5%')
	})

	it('scales top-10 holder concentration from a 0–1 decimal to percent', () => {
		expect(formatMetricValue('top10_pct', 1)).toBe('100%')
		expect(formatMetricValue('top10_pct', 0.945)).toBe('94.5%')
	})

	it('formats date columns', () => {
		expect(formatMetricValue('price_ath_ts', '2025-10-06T18:59:01.000Z')).toBe('Oct 6, 2025')
	})

	it('groups counts as integers and ratios with a multiplier sign', () => {
		expect(formatMetricValue('protocol_count', 1234)).toBe('1,234')
		expect(formatMetricValue('pf_ratio', 2.5)).toBe('2.5×')
	})

	it('passes through non-numeric and unknown plain values', () => {
		expect(formatMetricValue('name', 'aave')).toBe('aave')
		expect(formatMetricValue('some_unknown_field', 42)).toBe('42')
	})
})

describe('formatOutputValue (execute_code datapoints)', () => {
	it('appends % to already-scaled pct/rate/share keys without re-scaling', () => {
		expect(formatOutputValue('drawdown_pct', '-26.9')).toBe('-26.9%')
		expect(formatOutputValue('utilization_rate', '79.8')).toBe('79.8%')
	})
	it('formats date keys', () => {
		expect(formatOutputValue('peak_date', '2026-03-14')).toBe('Mar 14, 2026')
	})
	it('groups plain numeric output values', () => {
		expect(formatOutputValue('peak_tvl', 12218356119)).toBe('12,218,356,119')
	})
})

describe('humanizeColumn', () => {
	it('replaces underscores and title-cases', () => {
		expect(humanizeColumn('tvl_base')).toBe('Tvl Base')
		expect(humanizeColumn('protocol')).toBe('Protocol')
	})

	it('leaves already-spaced names sensibly cased', () => {
		expect(humanizeColumn('total value')).toBe('Total Value')
	})
})

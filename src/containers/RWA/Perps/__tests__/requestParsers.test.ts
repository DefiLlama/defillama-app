import { describe, expect, it } from 'vitest'
import { parseChartMetricKey, parseOptionalTarget } from '../requestParsers'

describe('parseChartMetricKey', () => {
	it('accepts the supported metric keys', () => {
		expect(parseChartMetricKey('openInterest')).toBe('openInterest')
		expect(parseChartMetricKey('volume24h')).toBe('volume24h')
		expect(parseChartMetricKey('markets')).toBe('markets')
	})

	it('rejects unsupported values', () => {
		expect(parseChartMetricKey(undefined)).toBeNull()
		expect(parseChartMetricKey(['openInterest'])).toBeNull()
		expect(parseChartMetricKey('activeMcap')).toBeNull()
	})
})

describe('parseOptionalTarget', () => {
	it('trims valid string values', () => {
		expect(parseOptionalTarget(' xyz ')).toBe('xyz')
	})

	it('returns undefined for missing values', () => {
		expect(parseOptionalTarget(undefined)).toBeUndefined()
	})

	it('rejects arrays and blank strings', () => {
		expect(parseOptionalTarget(['xyz'])).toBeNull()
		expect(parseOptionalTarget('   ')).toBeNull()
	})
})

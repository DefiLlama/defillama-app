import { describe, expect, it } from 'vitest'
import {
	hasExactlyOneTarget,
	parseBooleanQueryFlag,
	parseEnumQueryValue,
	parseOptionalStringTarget
} from '../requestParsers'

describe('RWA request parser primitives', () => {
	it('parses enum values and rejects arrays, blanks, and invalid values', () => {
		const allowed = ['one', 'two'] as const

		expect(parseEnumQueryValue('one', allowed)).toBe('one')
		expect(parseEnumQueryValue(['one'], allowed)).toBeNull()
		expect(parseEnumQueryValue('', allowed)).toBeNull()
		expect(parseEnumQueryValue('three', allowed)).toBeNull()
		expect(parseEnumQueryValue(undefined, allowed)).toBeNull()
	})

	it('parses boolean flags without accepting arrays or non-boolean strings', () => {
		expect(parseBooleanQueryFlag('true')).toBe(true)
		expect(parseBooleanQueryFlag('false')).toBe(false)
		expect(parseBooleanQueryFlag(undefined, true)).toBe(true)
		expect(parseBooleanQueryFlag(undefined)).toBeNull()
		expect(parseBooleanQueryFlag(['true'])).toBeNull()
		expect(parseBooleanQueryFlag('')).toBeNull()
		expect(parseBooleanQueryFlag('yes')).toBeNull()
	})

	it('parses optional string targets and rejects arrays or blanks', () => {
		expect(parseOptionalStringTarget(' ethereum ')).toBe('ethereum')
		expect(parseOptionalStringTarget(undefined)).toBeUndefined()
		expect(parseOptionalStringTarget(['ethereum'])).toBeNull()
		expect(parseOptionalStringTarget('')).toBeNull()
		expect(parseOptionalStringTarget('   ')).toBeNull()
	})

	it('requires exactly one target when a route parser calls for a single target', () => {
		expect(hasExactlyOneTarget(['ethereum', undefined, undefined])).toBe(true)
		expect(hasExactlyOneTarget([undefined, undefined])).toBe(false)
		expect(hasExactlyOneTarget(['ethereum', 'treasuries'])).toBe(false)
	})
})

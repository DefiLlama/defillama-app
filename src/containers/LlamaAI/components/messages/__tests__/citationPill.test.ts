import { describe, expect, it } from 'vitest'
import {
	badgeFor,
	defaultTierVisible,
	expandLabel,
	hiddenRowsLabel,
	iconFor,
	mismatchLabel,
	shouldFlagMismatch
} from '../citationPillHelpers'

describe('badgeFor', () => {
	it('data → DefiLlama', () => expect(badgeFor('data')).toBe('DefiLlama'))
	it('computed → Calculated', () => expect(badgeFor('computed')).toBe('Calculated'))
	it('web → Web, x → X', () => {
		expect(badgeFor('web')).toBe('Web')
		expect(badgeFor('x')).toBe('X')
	})
	it('file → File', () => expect(badgeFor('file')).toBe('File'))
	it('tool → Tool', () => expect(badgeFor('tool')).toBe('Tool'))
	it('unknown → Source', () => expect(badgeFor('totally_new')).toBe('Source'))
	it('missing → Source', () => expect(badgeFor(undefined)).toBe('Source'))
})

describe('iconFor', () => {
	it('web → earth, x → twitter', () => {
		expect(iconFor('web')).toBe('earth')
		expect(iconFor('x')).toBe('twitter')
	})
	it('data → layers, computed → code', () => {
		expect(iconFor('data')).toBe('layers')
		expect(iconFor('computed')).toBe('code')
	})
	it('file → file-text', () => expect(iconFor('file')).toBe('file-text'))
	it('unknown/missing → sparkles', () => {
		expect(iconFor('tool')).toBe('sparkles')
		expect(iconFor(undefined)).toBe('sparkles')
	})
})

describe('shouldFlagMismatch', () => {
	it('flags a quantitative mismatch', () =>
		expect(shouldFlagMismatch({ claimType: 'quantitative', grounded: true, valueMatch: 'mismatch' })).toBe(true))
	it('never flags qualitative', () =>
		expect(shouldFlagMismatch({ claimType: 'qualitative', grounded: true })).toBe(false))
	it('does not flag unverified (neutral)', () =>
		expect(shouldFlagMismatch({ claimType: 'quantitative', grounded: true, valueMatch: 'unverified' })).toBe(false))
	it('does not flag a match', () =>
		expect(shouldFlagMismatch({ claimType: 'quantitative', grounded: true, valueMatch: 'match' })).toBe(false))
	it('handles missing verification', () => expect(shouldFlagMismatch(undefined)).toBe(false))
})

describe('defaultTierVisible (Tier 3 raw query)', () => {
	it('hidden by default', () => expect(defaultTierVisible(false)).toBe(false))
	it('shown when advanced provenance is on', () => expect(defaultTierVisible(true)).toBe(true))
})

describe('expandLabel', () => {
	it('computed → How this was calculated', () => expect(expandLabel('computed')).toBe('How this was calculated'))
	it('data → See the data', () => expect(expandLabel('data')).toBe('See the data'))
	it('anything else → See the data', () => expect(expandLabel('file')).toBe('See the data'))
})

describe('mismatchLabel', () => {
	it('includes the cited value when present', () =>
		expect(mismatchLabel({ id: 1, sourceType: 'data', label: 'x', value: '$13.55B' })).toContain('$13.55B'))
	it('reads plainly with no value', () =>
		expect(mismatchLabel({ id: 1, sourceType: 'data', label: 'x' })).toBe("Couldn't confirm this figure"))
})

describe('hiddenRowsLabel', () => {
	it('null when no count', () => expect(hiddenRowsLabel(undefined)).toBe(null))
	it('null when zero', () => expect(hiddenRowsLabel(0)).toBe(null))
	it('counts when positive', () => expect(hiddenRowsLabel(42)).toBe('Rows hidden — 42 total'))
})

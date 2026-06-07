import { describe, expect, it } from 'vitest'
import type { UnifiedCitationReference } from '~/containers/LlamaAI/types'
import {
	badgeFor,
	computedSummaryLabel,
	describeFigure,
	domainFromUrl,
	friendlyToolName,
	iconFor,
	isPrivacySentinel,
	metricLabel,
	sanitizeExcerpt,
	shouldFlagMismatch,
	shouldFlagUnverified,
	toolArgRows,
	xHandleLabel
} from '../citationPillHelpers'

describe('metricLabel', () => {
	it('labels ratios and identity metrics', () => {
		expect(metricLabel('pf_ratio')).toBe('P/F ratio (price ÷ annual fees)')
		expect(metricLabel('mcap')).toBe('market cap')
		expect(metricLabel('tvl_base')).toBe('total value locked')
	})
	it('composes base + time window', () => {
		expect(metricLabel('fees_30d')).toBe('fees (30 days)')
		expect(metricLabel('fees_365d')).toBe('fees (1 year)')
		expect(metricLabel('app_fees_7d')).toBe('app fees (7 days)')
		expect(metricLabel('volume_derivatives_30d')).toBe('derivatives (perps) volume (30 days)')
		expect(metricLabel('chain_holder_revenue_30d')).toBe('chain holder revenue (30 days)')
	})
	it('handles pct_change as a change label', () => {
		expect(metricLabel('tvl_base_30d_pct_change')).toBe('total value locked change (30 days)')
		expect(metricLabel('mcap_7d_pct_change')).toBe('market cap change (7 days)')
		expect(metricLabel('tvl_30d_pct')).toBe('total value locked change (30 days)')
	})
	it('does not greedy-split multi-word bases', () => {
		expect(metricLabel('volume_options_notional')).toBe('options notional volume')
		expect(metricLabel('fdv_outstanding')).toBe('FDV (outstanding supply)')
	})
})

describe('describeFigure', () => {
	it('names the metric and entity from the cited row', () => {
		const ref = {
			id: 1,
			sourceType: 'data',
			label: 'DefiLlama warehouse',
			value: '2.5×',
			field: 'pf_ratio',
			rows: [{ name: 'uniswap', pf_ratio: 2.5 }],
			columns: ['name', 'pf_ratio']
		} as unknown as UnifiedCitationReference
		expect(describeFigure(ref, { rowIndex: 0, column: 'pf_ratio' })).toBe('Uniswap · P/F ratio (price ÷ annual fees)')
	})
	it('returns null when there is no field', () => {
		const ref = { id: 1, sourceType: 'computed', label: 'Calculated' } as UnifiedCitationReference
		expect(describeFigure(ref, null)).toBeNull()
	})
})

describe('sanitizeExcerpt', () => {
	it('returns empty for non-strings', () => {
		expect(sanitizeExcerpt(undefined)).toBe('')
		expect(sanitizeExcerpt(null)).toBe('')
		expect(sanitizeExcerpt(42)).toBe('')
	})

	it('strips a leading bracketed prefix', () => {
		expect(sanitizeExcerpt('[posted Jun 3] Aave hit a new high')).toBe('Aave hit a new high')
	})

	it('strips multiple leading bracket groups', () => {
		expect(sanitizeExcerpt('[a] [b]   real text')).toBe('real text')
	})

	it('strips a trailing bare URL', () => {
		expect(sanitizeExcerpt('Read more here https://t.co/abc123')).toBe('Read more here')
	})

	it('collapses whitespace', () => {
		expect(sanitizeExcerpt('a\n\n  b\t c')).toBe('a b c')
	})

	it('clamps to the max length with an ellipsis on a word boundary', () => {
		const long = 'word '.repeat(100).trim()
		const out = sanitizeExcerpt(long, 20)
		expect(out.length).toBeLessThanOrEqual(21)
		expect(out.endsWith('…')).toBe(true)
		expect(out).not.toContain('  ')
	})

	it('leaves clean short text untouched', () => {
		expect(sanitizeExcerpt('A clean tweet.')).toBe('A clean tweet.')
	})
})

describe('domainFromUrl', () => {
	it('extracts a bare domain and drops www', () => {
		expect(domainFromUrl('https://www.example.com/path?q=1')).toBe('example.com')
	})

	it('handles urls without a scheme', () => {
		expect(domainFromUrl('blog.defillama.com/post')).toBe('blog.defillama.com')
	})

	it('returns null for empty or non-string input', () => {
		expect(domainFromUrl('')).toBeNull()
		expect(domainFromUrl(undefined)).toBeNull()
		expect(domainFromUrl(123)).toBeNull()
	})
})

describe('xHandleLabel', () => {
	it('keeps an existing handle', () => {
		expect(xHandleLabel('@defillama')).toBe('@defillama')
	})

	it('prefixes a bare handle', () => {
		expect(xHandleLabel('defillama')).toBe('@defillama')
	})

	it('normalizes extra leading @', () => {
		expect(xHandleLabel('@@x')).toBe('@x')
	})

	it('returns null for empty input', () => {
		expect(xHandleLabel('')).toBeNull()
		expect(xHandleLabel(undefined)).toBeNull()
	})
})

describe('friendlyToolName', () => {
	it('prefers the provided label', () => {
		expect(friendlyToolName({ sourceType: 'tool', label: 'Onchain call' } as UnifiedCitationReference)).toBe(
			'Onchain call'
		)
	})

	it('falls back to a humanized tool name', () => {
		expect(
			friendlyToolName({ sourceType: 'tool', label: '', toolName: 'call_contract' } as UnifiedCitationReference)
		).toBe('Calling contract')
	})

	it('falls back to Tool when nothing is available', () => {
		expect(friendlyToolName({ sourceType: 'tool', label: '' } as UnifiedCitationReference)).toBe('Tool')
	})
})

describe('isPrivacySentinel', () => {
	it('matches the sentinel', () => {
		expect(isPrivacySentinel('[value omitted — sensitive]')).toBe(true)
		expect(isPrivacySentinel('  [value omitted — sensitive]  ')).toBe(true)
	})

	it('does not match other text', () => {
		expect(isPrivacySentinel('some value')).toBe(false)
		expect(isPrivacySentinel(undefined)).toBe(false)
	})
})

describe('toolArgRows', () => {
	it('humanizes keys and formats values', () => {
		expect(toolArgRows({ chain_id: 1, address: '0xabc' })).toEqual([
			{ key: 'Chain Id', value: '1' },
			{ key: 'Address', value: '0xabc' }
		])
	})

	it('drops empty values', () => {
		expect(toolArgRows({ a: '', b: null, c: 'x' })).toEqual([{ key: 'C', value: 'x' }])
	})

	it('joins arrays', () => {
		expect(toolArgRows({ ids: ['a', 'b'] })).toEqual([{ key: 'Ids', value: 'a, b' }])
	})

	it('returns empty for missing args', () => {
		expect(toolArgRows(undefined)).toEqual([])
	})
})

describe('computedSummaryLabel', () => {
	it('pluralizes by source count', () => {
		expect(
			computedSummaryLabel({ sourceType: 'computed', sources: [{}, {}] } as unknown as UnifiedCitationReference)
		).toBe('Calculated from 2 sources')
		expect(computedSummaryLabel({ sourceType: 'computed', sources: [{}] } as unknown as UnifiedCitationReference)).toBe(
			'Calculated from 1 source'
		)
	})

	it('returns null with no sources', () => {
		expect(computedSummaryLabel({ sourceType: 'computed' } as UnifiedCitationReference)).toBeNull()
	})
})

describe('verification flags', () => {
	it('flags only quantitative mismatch', () => {
		expect(shouldFlagMismatch({ claimType: 'quantitative', valueMatch: 'mismatch' } as any)).toBe(true)
		expect(shouldFlagMismatch({ claimType: 'quantitative', valueMatch: 'unverified' } as any)).toBe(false)
		expect(shouldFlagMismatch({ claimType: 'qualitative', valueMatch: 'mismatch' } as any)).toBe(false)
		expect(shouldFlagMismatch(undefined)).toBe(false)
	})
	it('flags only quantitative unverified', () => {
		expect(shouldFlagUnverified({ claimType: 'quantitative', valueMatch: 'unverified' } as any)).toBe(true)
		expect(shouldFlagUnverified({ claimType: 'quantitative', valueMatch: 'match' } as any)).toBe(false)
		expect(shouldFlagUnverified({ claimType: 'qualitative', valueMatch: 'unverified' } as any)).toBe(false)
		expect(shouldFlagUnverified(undefined)).toBe(false)
	})
})

describe('badgeFor / iconFor', () => {
	it('maps known source types', () => {
		expect(badgeFor('data')).toBe('DefiLlama')
		expect(badgeFor('x')).toBe('X')
		expect(badgeFor('unknown-future')).toBe('Source')
		expect(iconFor('x')).toBe('twitter')
		expect(iconFor('computed')).toBe('code')
		expect(iconFor('web')).toBe('earth')
		expect(iconFor('mystery')).toBe('sparkles')
	})
})

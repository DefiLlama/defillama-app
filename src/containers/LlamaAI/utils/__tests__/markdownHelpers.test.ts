import { describe, expect, it } from 'vitest'
import { processCitationMarkers } from '../markdownHelpers'

describe('processCitationMarkers', () => {
	const modelStyleCitation = '\u30105\u2020source\u3011'

	it('renders standard bracket citations as inline badges', () => {
		expect(
			processCitationMarkers('Institutional demand is rising [2].', ['https://one.test', 'https://two.test'])
		).toBe('Institutional demand is rising <citation-badge href="https://two.test/">2</citation-badge>.')
	})

	it('renders footnote and model-style citation markers with the same badge UI', () => {
		expect(
			processCitationMarkers(`Catalyst[^2] and confirmation ${modelStyleCitation}.`, [
				'https://one.test',
				'https://two.test',
				'https://three.test',
				'https://four.test',
				'https://five.test'
			])
		).toBe(
			'Catalyst<citation-badge href="https://two.test/">2</citation-badge> and confirmation <citation-badge href="https://five.test/">5</citation-badge>.'
		)
	})

	it('expands ranges with optional whitespace inside citation markers', () => {
		expect(processCitationMarkers('See [1 - 3].', ['https://one.test', 'https://two.test', 'https://three.test'])).toBe(
			'See <citation-badge href="https://one.test/">1</citation-badge><citation-badge href="https://two.test/">2</citation-badge><citation-badge href="https://three.test/">3</citation-badge>.'
		)
	})

	it('strips citation markers entirely when no citation urls are available', () => {
		expect(processCitationMarkers(`One [1], two [^2], three ${modelStyleCitation}.`, [])).toBe('One , two , three .')
	})
})

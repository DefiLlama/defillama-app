import { describe, expect, it } from 'vitest'
import { matchesRwaPlatform } from './grouping'

describe('matchesRwaPlatform', () => {
	it('matches array-valued parentPlatform entries for platform pages', () => {
		expect(matchesRwaPlatform(['Centrifuge', 'Maple'], 'maple')).toBe(true)
		expect(matchesRwaPlatform(['Centrifuge', 'Maple'], 'goldfinch')).toBe(false)
	})
})

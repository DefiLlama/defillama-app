import { describe, expect, it } from 'vitest'
import {
	RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT,
	RESEARCH_LANDING_SECTION_LIMITS,
	takeUniqueArticles
} from '~/containers/Articles/landing/utils'

type ArticleStub = { id: string; title: string }

const article = (id: string): ArticleStub => ({ id, title: `Article ${id}` })

describe('researchLandingDedup', () => {
	it('collections fetch limit equals the sum of all landing section limits', () => {
		const expected = Object.values(RESEARCH_LANDING_SECTION_LIMITS).reduce((sum, limit) => sum + limit, 0)
		expect(RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT).toBe(expected)
		expect(RESEARCH_LANDING_COLLECTIONS_FETCH_LIMIT).toBe(92)
	})

	describe('takeUniqueArticles', () => {
		it('preserves order, excludes used ids, and stops at limit', () => {
			const candidates = [article('1'), article('2'), article('3'), article('4'), article('5')]
			const excluded = new Set(['2', '4'])

			expect(takeUniqueArticles(candidates, excluded, 2)).toEqual([article('1'), article('3')])
		})

		it('returns up to limit unique articles when many candidates overlap', () => {
			const candidates = Array.from({ length: 30 }, (_, i) => article(String(i + 1)))
			const excluded = new Set(Array.from({ length: 10 }, (_, i) => String(i + 1)))

			const result = takeUniqueArticles(candidates, excluded, 15)

			expect(result).toHaveLength(15)
			expect(result.map((a) => a.id)).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 11)))
		})

		it('returns fewer than limit when not enough unique candidates remain', () => {
			const candidates = [article('a'), article('b'), article('c')]
			const excluded = new Set(['a', 'b'])

			expect(takeUniqueArticles(candidates, excluded, 15)).toEqual([article('c')])
		})
	})
})

import { describe, expect, it } from 'vitest'
import { makeEmptyPeoplePanelConfig, normalizePeopleHref, validateArticlePeoplePanel } from '../editor/peoplePanel'

describe('article people panels', () => {
	it('normalizes bare links while preserving absolute and mailto links', () => {
		expect(normalizePeopleHref('vitalik.eth.limo')).toBe('https://vitalik.eth.limo')
		expect(normalizePeopleHref('https://example.com/alice')).toBe('https://example.com/alice')
		expect(normalizePeopleHref('mailto:research@example.com')).toBe('mailto:research@example.com')
		expect(normalizePeopleHref('   ')).toBe('')
	})

	it('drops entries without an image source and trims text fields', () => {
		expect(
			validateArticlePeoplePanel({
				label: ' Researchers ',
				items: [
					{ name: 'No image', bio: 'ignored', href: 'example.com' },
					{
						imageId: 'img-1',
						src: 'https://images.example.com/alice.png',
						width: 320,
						height: 240,
						name: ' Alice ',
						bio: ' Protocol analyst ',
						href: 'alice.example'
					}
				]
			})
		).toEqual({
			label: 'Researchers',
			items: [
				{
					imageId: 'img-1',
					src: 'https://images.example.com/alice.png',
					width: 320,
					height: 240,
					name: 'Alice',
					bio: 'Protocol analyst',
					href: 'https://alice.example'
				}
			]
		})
	})

	it('rejects empty panels', () => {
		expect(validateArticlePeoplePanel(makeEmptyPeoplePanelConfig())).toBeNull()
		expect(validateArticlePeoplePanel({ label: 'Team', items: [] })).toBeNull()
	})
})

import { describe, expect, it } from 'vitest'
import { diffMetadata, diffParagraphs, diffStats, diffWords } from '../editor/revisionDiff'

describe('article revision diffs', () => {
	it('coalesces word-level additions and removals', () => {
		expect(diffWords('Aave fees rose', 'Aave fees fell sharply')).toEqual([
			{ type: 'equal', value: 'Aave fees ' },
			{ type: 'remove', value: 'rose' },
			{ type: 'add', value: 'fell sharply' }
		])
	})

	it('detects modified paragraphs between equal and added paragraphs', () => {
		const diff = diffParagraphs(
			'Intro\n\nAave fees rose\n\nConclusion',
			'Intro\n\nAave fees fell\n\nConclusion\n\nNew note'
		)

		expect(diff).toMatchObject([
			{ type: 'equal', value: 'Intro' },
			{ type: 'modify', before: 'Aave fees rose', after: 'Aave fees fell' },
			{ type: 'equal', value: 'Conclusion' },
			{ type: 'add', value: 'New note' }
		])
	})

	it('summarizes word counts across all paragraph changes', () => {
		const diff = diffParagraphs(
			'Intro\n\nAave fees rose\n\nConclusion',
			'Intro\n\nAave fees fell sharply\n\nConclusion\n\nNew note'
		)

		expect(diffStats(diff)).toEqual({ added: 4, removed: 1 })
	})

	it('reports metadata changes for text, status, and tags', () => {
		const changes = diffMetadata(
			{
				title: 'Stablecoin flows',
				slug: 'stablecoin-flows',
				status: 'draft',
				tags: ['stablecoins']
			},
			{
				title: 'Stablecoin flows after the depeg',
				slug: 'stablecoin-flows-after-the-depeg',
				status: 'published',
				tags: ['stablecoins', 'risk']
			}
		)

		expect(changes).toEqual([
			{
				key: 'title',
				label: 'Title',
				before: 'Stablecoin flows',
				after: 'Stablecoin flows after the depeg',
				kind: 'text'
			},
			{
				key: 'slug',
				label: 'Slug',
				before: 'stablecoin-flows',
				after: 'stablecoin-flows-after-the-depeg',
				kind: 'text'
			},
			{ key: 'status', label: 'Status', before: 'draft', after: 'published', kind: 'status' },
			{ key: 'tags', label: 'Tags', before: 'stablecoins', after: 'stablecoins, risk', kind: 'tags' }
		])
	})
})

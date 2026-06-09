import { sanitize } from 'hast-util-sanitize'
import { describe, expect, it } from 'vitest'
import { SANITIZE_SCHEMA } from '../sanitizeConfig'

describe('SANITIZE_SCHEMA', () => {
	it('preserves the fact-check pill dataRef property used by rehype', () => {
		const tree = {
			type: 'root',
			children: [
				{
					type: 'element',
					tagName: 'fact-check-pill',
					properties: { dataRef: '3' },
					children: []
				}
			]
		}

		const sanitized = sanitize(tree as any, SANITIZE_SCHEMA as any) as any

		expect(sanitized.children[0].properties).toEqual({ dataRef: '3' })
	})
})

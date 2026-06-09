import type { Root } from 'hast'
import { sanitize, type Schema } from 'hast-util-sanitize'
import { describe, expect, it } from 'vitest'
import { SANITIZE_SCHEMA } from '../sanitizeConfig'

describe('SANITIZE_SCHEMA', () => {
	it('preserves the fact-check pill dataRef property used by rehype', () => {
		const tree: Root = {
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
		const schema: Schema = SANITIZE_SCHEMA

		const sanitized = sanitize(tree, schema)
		if (sanitized.type !== 'root') throw new Error('Expected a sanitized root')
		const pill = sanitized.children[0]
		if (pill.type !== 'element') throw new Error('Expected a sanitized element')

		expect(pill.properties).toEqual({ dataRef: '3' })
	})
})

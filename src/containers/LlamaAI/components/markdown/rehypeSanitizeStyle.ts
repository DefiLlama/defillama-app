import type { Root, Element } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Strip CSS properties that can be used to create overlays, hijack clicks,
 * or otherwise break the page layout from user/AI-generated HTML.
 */
const DANGEROUS_CSS_RE =
	/\b(position\s*:\s*(fixed|absolute|sticky)|z-index\s*:\s*\d+|pointer-events\s*:\s*\w|opacity\s*:\s*0(\.\d+)?(?!\d))\b/i

export function rehypeSanitizeStyle() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			const style = node.properties?.style
			if (typeof style !== 'string') return

			const cleaned = style
				.split(';')
				.filter((decl) => !DANGEROUS_CSS_RE.test(decl.trim()))
				.join(';')
				.trim()

			if (cleaned) {
				node.properties.style = cleaned
			} else {
				delete node.properties.style
			}
		})
	}
}

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NameYieldPool } from '../Tables/Name'

describe('NameYieldPool', () => {
	it('omits the external link when the pool url is empty', () => {
		const html = renderToStaticMarkup(
			<NameYieldPool value="USDY" configID="pool-id" url="" bookmark={false} withoutLink />
		)

		expect(html).not.toContain('open in new tab')
		expect(html).not.toContain('href=""')
	})

	it('renders the external link when the pool url is present', () => {
		const html = renderToStaticMarkup(
			<NameYieldPool value="USDY" configID="pool-id" url="https://example.com/pool" bookmark={false} withoutLink />
		)

		expect(html).toContain('href="https://example.com/pool"')
		expect(html).toContain('open in new tab')
	})
})

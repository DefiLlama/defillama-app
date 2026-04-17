import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TokenOverviewHeader } from './TokenOverviewHeader'

describe('TokenOverviewHeader', () => {
	it('renders the top token stats layout used by unlocks and token pages', () => {
		const html = renderToStaticMarkup(
			<TokenOverviewHeader
				name="Bitcoin"
				price={100}
				percentChange={5}
				circSupply={21}
				maxSupply={21}
				mcap={1000}
				fdv={1500}
				volume24h={500}
				symbol="BTC"
			/>
		)

		expect(html).toContain('Bitcoin')
		expect(html).toContain('Circ. Supply')
		expect(html).toContain('Max Supply')
		expect(html).toContain('MCap')
		expect(html).toContain('FDV')
		expect(html).toContain('Vol 24h')
		expect(html).toContain('BTC')
		expect(html).toContain('+')
	})
})

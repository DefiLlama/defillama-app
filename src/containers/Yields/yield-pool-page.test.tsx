import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/layout', () => ({
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

import { ProtocolInformationCard } from '~/pages/yields/pool/[pool]'

describe('YieldPoolPage', () => {
	it('renders an internal protocol link in the protocol information card', () => {
		const html = renderToStaticMarkup(
			<ProtocolInformationCard category="Dexs" projectName="Aerodrome" projectSlug="aerodrome" config={{}} url="" />
		)

		expect(html).toContain('href="/protocol/aerodrome"')
		expect(html).toContain('>Aerodrome</a>')
	})
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { getServerSideProps } from '~/pages/yields/pool/[pool]'
import { ProtocolInformationCard } from './ProtocolInformationCard'

describe('YieldPoolPage', () => {
	it('renders an internal protocol link in the protocol information card', () => {
		const html = renderToStaticMarkup(
			<ProtocolInformationCard category="Dexs" projectName="Aerodrome" projectSlug="aerodrome" config={{}} url="" />
		)

		expect(html).toContain('href="/protocol/aerodrome"')
		expect(html).toContain('>Aerodrome</a>')
	})

	it('returns not found for malformed pool ids before fetching data', async () => {
		const res = { setHeader: vi.fn() }

		const result = await getServerSideProps({
			params: {
				pool: '79e042b5-e55d-4a4e-b0b0-6661a570470b%252525253Cgrok%3Arender'
			},
			res
		} as any)

		expect(result).toEqual({ notFound: true })
		expect(res.setHeader).not.toHaveBeenCalled()
	})
})

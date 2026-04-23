import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/router', () => ({
	useRouter: () => ({
		query: { pool: 'missing-pool' },
		isReady: true
	})
}))

vi.mock('~/containers/Yields/queries/client', () => ({
	useYieldPoolData: () => ({
		data: { data: [] },
		isLoading: false
	}),
	useYieldConfigData: () => ({
		data: null,
		isLoading: false
	}),
	useYieldChartData: () => ({
		data: null,
		isLoading: false
	}),
	useYieldChartLendBorrow: () => ({
		data: null,
		isLoading: false
	}),
	useVolatility: () => ({
		data: null
	}),
	useHolderHistory: () => ({
		data: null
	}),
	useHolderStats: () => ({
		data: null
	})
}))

vi.mock('~/components/NotFoundPage', () => ({
	NotFoundPage: () => <div>missing-pool-404</div>
}))

vi.mock('~/layout', () => ({
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

import YieldPoolPage, { ProtocolInformationCard } from '~/pages/yields/pool/[pool]'

describe('YieldPoolPage', () => {
	it('renders the 404 page when the pool query resolves empty', () => {
		const html = renderToStaticMarkup(<YieldPoolPage />)

		expect(html).toContain('missing-pool-404')
	})

	it('renders an internal protocol link in the protocol information card', () => {
		const html = renderToStaticMarkup(
			<ProtocolInformationCard category="Dexs" projectName="Aerodrome" projectSlug="aerodrome" config={{}} url="" />
		)

		expect(html).toContain('href="/protocol/aerodrome"')
		expect(html).toContain('>Aerodrome</a>')
	})
})

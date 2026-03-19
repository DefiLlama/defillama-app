import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWAChainsTable } from '~/containers/RWA/Chains'
import { getRWAChainsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import { RWATabNav } from '~/containers/RWA/TabNav'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const { rows: chains, chartDatasets } = await getRWAChainsOverview()

	if (!chains) {
		throw new Error('chains not found in RWA list')
	}

	const chainLinks = rwaList.chains.map((chain) => ({
		label: chain,
		to: `/rwa/chain/${rwaSlug(chain)}`
	}))

	if (chainLinks.length === 0) {
		throw new Error('chains not found in RWA list')
	}

	return {
		props: {
			chains,
			chartDatasets,
			chainLinks: [{ label: 'All', to: '/rwa/chains' }, ...chainLinks]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA']

export default function RWAChainsPage({ chains, chainLinks, chartDatasets }) {
	return (
		<Layout
			title="RWA by Chain - Real World Assets Analytics - DefiLlama"
			description="Compare RWA adoption across blockchains. Track Active Mcap, Onchain Mcap, and DeFi Active TVL by chain."
			pageName={pageName}
			canonicalUrl={`/rwa/chains`}
		>
			<RWATabNav active="chains" />
			<RowLinksWithDropdown links={chainLinks} activeLink={'All'} />
			<RWAChainsTable chains={chains} chartDatasets={chartDatasets} />
		</Layout>
	)
}

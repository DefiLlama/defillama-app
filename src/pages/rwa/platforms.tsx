import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWAPlatformsTable } from '~/containers/RWA/Platforms'
import { getRWAPlatformsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/platforms`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const { rows: platforms, chartDatasets } = await getRWAPlatformsOverview()

	if (!platforms) {
		throw new Error('platforms not found in RWA list')
	}

	const platformLinks = rwaList.platforms.map((platform) => ({
		label: platform,
		to: `/rwa/platform/${rwaSlug(platform)}`
	}))

	if (platformLinks.length === 0) {
		throw new Error('platforms not found in RWA list')
	}

	return {
		props: {
			platforms,
			chartDatasets,
			platformLinks: [{ label: 'All', to: '/rwa/platforms' }, ...platformLinks]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Platforms']

export default function RWAPlatformsPage({ platforms, platformLinks, chartDatasets }) {
	return (
		<Layout
			title="Real World Assets (RWA) by Platform Dashboard & Analytics - DefiLlama"
			description={`Discover RWA platforms that enable the issuance, custody, trading, or management of tokenized real-world assets across blockchains.`}
			pageName={pageName}
			canonicalUrl={`/rwa/platforms`}
		>
			<RowLinksWithDropdown links={platformLinks} activeLink={'All'} />
			<RWAPlatformsTable platforms={platforms} chartDatasets={chartDatasets} />
		</Layout>
	)
}

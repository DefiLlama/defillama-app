import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWAPlatformsTable } from '~/containers/RWA/Platforms'
import { getRWAPlatformsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/platforms`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const platforms = await getRWAPlatformsOverview()

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
			platformLinks: [{ label: 'All', to: '/rwa/platforms' }, ...platformLinks]
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Platforms']

export default function RWAPlatformsPage({ platforms, platformLinks }) {
	return (
		<Layout
			title="RWA Platforms - DefiLlama"
			description={`Real World Assets by platform on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, rwa platforms, rwa onchain by platform`}
			pageName={pageName}
			canonicalUrl={`/rwa/platform`}
		>
			<RowLinksWithDropdown links={platformLinks} activeLink={'All'} />
			<RWAPlatformsTable platforms={platforms} />
		</Layout>
	)
}

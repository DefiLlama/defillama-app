import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { RWAPlatformsTable } from '~/containers/RWA/Platforms'
import { getRWAPlatformsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/platforms`, async () => {
	const platforms = await getRWAPlatformsOverview()

	if (!platforms) return { notFound: true }

	return {
		props: {
			platforms,
			platformLinks: [
				{ label: 'All', to: '/rwa/platforms' },
				...platforms.map((platform) => ({
					label: platform.platform,
					to: `/rwa/platform/${rwaSlug(platform.platform)}`
				}))
			]
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

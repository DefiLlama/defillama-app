import { maxAgeForNext } from '~/api'
import { RWAPlatformsTable } from '~/containers/RWA/Platforms'
import { getRWAPlatformsOverview } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/platforms`, async () => {
	const platforms = await getRWAPlatformsOverview()

	if (!platforms) return { notFound: true }

	return {
		props: { platforms },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA Platforms']

export default function RWAPlatformsPage({ platforms }) {
	return (
		<Layout
			title="RWA Platforms - DefiLlama"
			description={`Real World Assets by platform on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, rwa platforms, rwa onchain by platform`}
			pageName={pageName}
			canonicalUrl={`/rwa/platform`}
		>
			<RWAPlatformsTable platforms={platforms} />
		</Layout>
	)
}

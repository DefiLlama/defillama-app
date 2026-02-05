import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`rwa/index`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	const props = await getRWAAssetsOverview({ rwaList })

	if (!props) return { notFound: true }

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['RWA']

export default function RWAPage(props) {
	return (
		<Layout
			title="Real World Assets - DefiLlama"
			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}

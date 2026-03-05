import type { InferGetStaticPropsType } from 'next'
import { DATOverview } from '~/containers/DAT/Overview'
import { getDATOverviewData } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

export const getStaticProps = withPerformanceLogging('digital-asset-treasuries/index', async () => {
	const props = await getDATOverviewData()

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

export default function DigitalAssetTreasuriesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Digital Asset Treasuries - DefiLlama"
			description="Track institutional digital asset holdings. See which public companies own Bitcoin, ETH and other crypto in their corporate treasuries."
			canonicalUrl="/digital-asset-treasuries"
			pageName={pageName}
		>
			<DATOverview {...props} />
		</Layout>
	)
}

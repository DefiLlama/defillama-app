import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { DATOverview } from '~/containers/DAT/Overview'
import { getDATOverviewData } from '~/containers/DAT/queries'
import Layout from '~/layout'
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
			description="Track institutions that own digital assets as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency."
			keywords="digital asset treasury, digital asset treasuries, digital asset treasury by institution, digital asset treasury by company, digital asset treasury by asset"
			canonicalUrl="/digital-asset-treasuries"
			pageName={pageName}
		>
			<DATOverview {...props} />
		</Layout>
	)
}

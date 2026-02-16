import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { DATOverview } from '~/containers/DAT/Overview'
import { getDATOverviewData } from '~/containers/DAT/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('digital-asset-treasuries/index', async () => {
	const props = await getDATOverviewData()

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

export default function DigitalAssetTreasuriesPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return <DATOverview {...props} />
}

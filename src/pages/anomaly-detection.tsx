import { AnomalyDetection } from '~/containers/AnomalyDetection'
import { getAnomalyDetectionData } from '~/containers/AnomalyDetection/queries'
import type { AnomalyDetectionProps } from '~/containers/AnomalyDetection/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('anomaly-detection', async () => {
	const data = await getAnomalyDetectionData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Anomaly Detection']

export default function AnomalyDetectionPage(props: AnomalyDetectionProps) {
	return (
		<Layout
			title="Anomaly Detection - Unusual TVL & Fee Activity - DefiLlama"
			description="Real-time detection of unusual TVL and fee activity across DeFi protocols using z-score analysis. Spot spikes and drops before they become headlines."
			canonicalUrl="/anomaly-detection"
			pageName={pageName}
		>
			<AnomalyDetection {...props} />
		</Layout>
	)
}

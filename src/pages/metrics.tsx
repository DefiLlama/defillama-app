import { Metrics } from '~/components/Metrics'
import Layout from '~/layout'

export default function MetricsPageView() {
	return (
		<Layout
			title="Metrics - DefiLlama"
			description={`Overview all metrics tracked on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`metrics, defi metrics, metrics on blockchain`}
			canonicalUrl={`/metrics`}
		>
			<Metrics />
		</Layout>
	)
}

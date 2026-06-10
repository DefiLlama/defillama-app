import { Metrics } from '~/components/Metrics'
import { NewsletterSignup } from '~/components/Newsletter/NewsletterSignup'
import Layout from '~/layout'

export default function MetricsPageView() {
	return (
		<Layout
			title="Industry Metrics - DeFi Analytics Dashboard - DefiLlama"
			description="Explore all DeFi metrics tracked on DefiLlama: TVL, fees, revenue, volume, yields, and more. Comprehensive DeFi analytics dashboard covering 7000+ protocols and 500+ chains with historical charts and trends."
			canonicalUrl={`/metrics`}
		>
			<NewsletterSignup layout="strip" />
			<Metrics />
		</Layout>
	)
}

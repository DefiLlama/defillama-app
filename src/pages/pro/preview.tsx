import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import Layout from '~/layout'

export default function ProPreviewPage() {
	return (
		<ProDashboardAPIProvider>
			<Layout
				title="DefiLlama Pro Dashboard - Preview"
				description="Preview DefiLlama Pro dashboards. Explore custom DeFi analytics built with TVL, fees, volume, and protocol metrics."
				canonicalUrl={`/pro/preview`}
			>
				<DemoPreview />
			</Layout>
		</ProDashboardAPIProvider>
	)
}

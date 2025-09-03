import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import Layout from '~/layout'

export default function ProPreviewPage() {
	return (
		<ProDashboardAPIProvider>
			<Layout
				title="DefiLlama Pro Dashboard - Preview"
				description={`Pro Dashboard on DefiLlama. Custom no-code dashboards with TVL, Fees, Volume, and other metrics. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
				keywords=""
				canonicalUrl={`/pro/preview`}
			>
				<DemoPreview />
			</Layout>
		</ProDashboardAPIProvider>
	)
}

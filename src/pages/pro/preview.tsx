import { DemoPreview } from '~/containers/ProDashboard/components/DemoPreview'
import { ProDashboardAPIProvider } from '~/containers/ProDashboard/ProDashboardAPIContext'
import Layout from '~/layout'

export default function ProPreviewPage() {
	return (
		<ProDashboardAPIProvider>
			<Layout title="DefiLlama Pro Dashboard - Preview">
				<DemoPreview />
			</Layout>
		</ProDashboardAPIProvider>
	)
}
import { DownloadsCatalog } from '~/containers/Downloads'
import { fetchAllChartOptions, type ChartOptionsMap } from '~/containers/Downloads/chart-datasets'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const pageName = ['Downloads']

interface DownloadsPageProps {
	chartOptionsMap: ChartOptionsMap
}

export const getStaticProps = withPerformanceLogging('downloads', async () => {
	const chartOptionsMap = await fetchAllChartOptions()

	return {
		props: { chartOptionsMap },
		revalidate: maxAgeForNext([22])
	}
})

export default function DownloadsPage({ chartOptionsMap }: DownloadsPageProps) {
	return (
		<Layout
			title="Downloads - DefiLlama"
			description="Download CSV datasets from the DefiLlama API including protocols, yields, fees, revenue, stablecoins, hacks, raises, and more."
			canonicalUrl="/downloads"
			pageName={pageName}
		>
			<DownloadsCatalog chartOptionsMap={chartOptionsMap} />
		</Layout>
	)
}

import { DownloadsCatalog } from '~/containers/Downloads'
import Layout from '~/layout'

const pageName = ['Downloads']

export default function DownloadsPage() {
	return (
		<Layout
			title="Downloads - DefiLlama"
			description="Download CSV datasets from the DefiLlama API including protocols, yields, fees, revenue, stablecoins, hacks, raises, and more."
			canonicalUrl="/downloads"
			pageName={pageName}
		>
			<DownloadsCatalog />
		</Layout>
	)
}

import Layout from '~/layout'
import { RAISES_API } from '~/constants'
import ChainPage from '~/components/ChainPage'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { getChainsPageData } from '~/api/categories/adaptors'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'

import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainPageData()
	const volumeData = await getChainsPageData('dexs')
	const raisesData = await fetch(RAISES_API).then((r) => r.json())
	const stablecoinsData = await getPeggedOverviewPageData(null)
	return {
		props: { ...data.props, volumeData, raisesData, stablecoinsData },
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainPage {...props} />
		</Layout>
	)
}

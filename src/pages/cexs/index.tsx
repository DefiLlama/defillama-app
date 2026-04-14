import { Cexs } from '~/containers/Cexs'
import { getCexsPageData } from '~/containers/Cexs/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('cexs/index', async () => {
	const data = await getCexsPageData()
	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['CEXs', 'ranked by', 'Assets']

export default function CexsPage({ cexs }) {
	return (
		<Layout
			title="CEX Rankings - Transparency & Proof of Reserves - DefiLlama"
			description="Track centralized exchange (CEX) transparency and proof of reserves. Monitor exchange holdings, asset backing, and solvency metrics. Verify CEX balances for Binance, OKX, Bybit, and 50+ exchanges."
			canonicalUrl={`/cexs`}
			pageName={pageName}
		>
			<Cexs cexs={cexs} />
		</Layout>
	)
}

//build

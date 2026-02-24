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
			title={`CEX Transparency - DefiLlama`}
			description={`Which exchanges hold the most assets? Live CEX rankings with inflow data, volume, open interest and average leverage for Binance, Robinhood and 50+ exchanges.`}
			keywords={`cex transparency, cex assets, cex rankings`}
			canonicalUrl={`/cexs`}
			pageName={pageName}
		>
			<Cexs cexs={cexs} />
		</Layout>
	)
}

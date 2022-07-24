import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { revalidate } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	let data = await getYieldPageData()
	// hardcoding toggles for stablecoins
	data.props.pools = data.props.pools.filter(
		(p) =>
			p.stablecoin === true &&
			p.tvlUsd >= 10e6 &&
			p.ilRisk === 'no' &&
			p.outlier === false &&
			p.apy > 0 &&
			p.audits !== '0'
	)

	return {
		...data,
		revalidate: revalidate(23)
	}
}

export default function YieldPlots(props) {
	return (
		<Layout title={`Stablecoins - DefiLlama Yield`} defaultSEO>
			<YieldPage {...props} />
		</Layout>
	)
}

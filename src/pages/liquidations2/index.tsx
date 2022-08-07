import Layout from '~/layout'
import LiquidationsPage from '~/components/LiquidationsPage2'
import { getLiquidationsPageData } from '~/api/categories/liquidations'

export async function getStaticProps() {
	const data = await getLiquidationsPageData()

	return {
		...data,
		revalidate: 20 * 60
	}
}

export default function LiquidationsHomePage(props) {
	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<LiquidationsPage {...props} />
		</Layout>
	)
}

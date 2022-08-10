/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import { revalidate } from '~/api'
import { ChartData, getLatestChartData } from '~/utils/liquidations'

import Layout from '~/layout'
import { LiquidationsSearch } from '~/components/Search'
import { Header } from '~/Theme'
import { LiquidationsHeader } from '../../components/LiquidationsPage/LiquidationsHeader'

export const getStaticProps: GetStaticProps<ChartData> = async ({ params }) => {
	const symbol = params.symbol as string
	const data = await getLatestChartData(symbol.toUpperCase())
	// TODO: handle error properly
	return {
		props: data,
		revalidate: revalidate(10)
	}
}

export const getStaticPaths: GetStaticPaths = async () => {
	// TODO: make api for all tracked symbols
	const paths = ['ETH', 'WBTC', 'USDC', 'DAI', 'YFI', 'UNI'].map((x) => ({
		params: { symbol: x.toLowerCase() }
	}))
	return { paths, fallback: 'blocking' }
}

const LiquidationsHomePage: NextPage<ChartData> = (props) => {
	return (
		<Layout title={`${props.symbol} Liquidation Levels - DefiLlama`} defaultSEO>
			<LiquidationsSearch step={{ category: 'Liquidation Levels', name: props.symbol, hideOptions: true }} />
			<Header>Liquidation levels in DeFi 💦</Header>
			<LiquidationsHeader {...props} />
		</Layout>
	)
}

export default LiquidationsHomePage

/* eslint-disable no-unused-vars*/
// eslint sucks at types
import { NextPage, GetStaticProps, GetStaticPaths } from 'next'
import Layout from '~/layout'
import { revalidate } from '~/api'
import { getLiquidationsPageData } from '~/api/categories/liquidations'
import { ChartData } from '~/utils/liquidations'

export const getStaticProps: GetStaticProps<ChartData | { error: string }> = async ({ params }) => {
	const symbol = params.symbol as string
	const data = await getLiquidationsPageData(symbol)
	// TODO: handle error properly
	return {
		...data,
		revalidate: revalidate(10)
	}
}

export const getStaticPaths: GetStaticPaths = async () => {
	// TODO: make api for all tracked symbols
	const paths = ['ETH', 'WBTC', 'USDC', 'USDT', 'DAI', 'YFI', 'UNI', 'WSTETH'].map((x) => ({
		params: { symbol: x.toLowerCase() }
	}))
	return { paths, fallback: 'blocking' }
}

const LiquidationsHomePage: NextPage<ChartData | { error: string }> = (props) => {
	if ('error' in props) {
		return (
			<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
				<h1>Not found</h1>
			</Layout>
		)
	}
	return (
		<Layout title={`Liquidation Levels - DefiLlama`} defaultSEO>
			<h1>Liquidations {props.symbol}</h1>
		</Layout>
	)
}

export default LiquidationsHomePage

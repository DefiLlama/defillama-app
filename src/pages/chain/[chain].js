import ChainPage from '~/components/ChainPage'
import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/protocols'
import { getChainsPageData, getOverviewItemPageData } from '~/api/categories/adaptors'
import { chainCoingeckoIds } from '~/constants/chainTokens'

export async function getStaticProps({ params }) {
	const chain = params.chain
	const data = await getChainPageData(chain)

	const volumeData = await getChainsPageData('dexs')
	const feesData = await getOverviewItemPageData('fees', chain)
	const tokenChart = chainCoingeckoIds[chain]
		? await fetch(
				`https://api.coingecko.com/api/v3/coins/${chainCoingeckoIds[chain].geckoId}/market_chart?vs_currency=usd&days=max&interval=daily`
		  ).then((r) => r.json())
		: null

	return {
		props: {
			...data.props,
			volumeData,
			feesData,
			tokenChart
		},
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API)

	const paths = (await res.json()).chains.slice(0, 20).map((chain) => ({
		params: { chain }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain({ chain, ...props }) {
	return (
		<Layout title={`${chain} TVL - DefiLlama`}>
			<ChainPage {...props} selectedChain={chain} />
		</Layout>
	)
}

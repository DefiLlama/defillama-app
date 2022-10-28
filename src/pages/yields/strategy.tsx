import Layout from '~/layout'
import YieldsStrategyPage from '~/components/YieldsPage/indexStrategy'
import { getCGMarketsDataURLs, revalidate } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import pako from 'pako'
import { arrayFetcher } from '~/utils/useSWR'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	const {
		props: { pools, allPools, ...data }
	} = await getLendBorrowData()

	const yieldsList = await arrayFetcher(getCGMarketsDataURLs())

	// restrict bororw and farming part (min apy's, noIL, single exposure only)
	// and uppercase symbols (lend and borrow strings from router are upper case only)
	const filteredPools = pools
		.filter((p) => p.apy > 0.01 && p.apyBorrow !== 0)
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	// ~1500pools
	// and uppercase symbols (lend and borrow strings from router are upper case only)
	const filteredAllPools = allPools
		.filter((p) => p.ilRisk === 'no' && p.exposure === 'single' && p.apy > 0)
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	const strData = JSON.stringify({
		props: { pools: filteredPools, allPools: filteredAllPools, yieldsList: yieldsList?.flat(), ...data }
	})

	const a = pako.deflate(strData)
	const compressed = Buffer.from(a).toString('base64')

	return {
		props: { compressed },
		revalidate: revalidate(23)
	}
}

export default function YieldStrategies(compressedProps) {
	const b = new Uint8Array(Buffer.from(compressedProps.compressed, 'base64'))
	const data = JSON.parse(pako.inflate(b, { to: 'string' }))
	return (
		<Layout title={`Yield Strategies - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPage {...data.props} />
		</Layout>
	)
}

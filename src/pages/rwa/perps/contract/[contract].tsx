import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { RWAPerpsCoinPage } from '~/containers/RWA/Perps/Coin'
import { getRWAPerpsCoinData } from '~/containers/RWA/Perps/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	return {
		paths: metadataCache.rwaPerpsList.coins.slice(0, 10).map((contract) => ({ params: { contract } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	'rwa/perps/contract/[contract]',
	async ({ params }: GetStaticPropsContext<{ contract: string }>) => {
		if (!params?.contract) {
			return { notFound: true }
		}

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.rwaPerpsList.coins.includes(params.contract)) {
			return { notFound: true }
		}

		const coin = await getRWAPerpsCoinData({ coin: params.contract })
		if (!coin) {
			return { notFound: true }
		}

		return {
			props: { coin },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA', 'Perps']

export default function RWAPerpsCoinDetailPage({ coin }: InferGetStaticPropsType<typeof getStaticProps>) {
	const canonicalContract = encodeURIComponent(coin.coin.coin)

	return (
		<Layout
			title={`${coin.coin.coin} - RWA Perps Analytics - DefiLlama`}
			description={`Track the ${coin.coin.coin} perpetual market on ${coin.coin.venue}, including price, open interest, funding, market history, and detailed market data.`}
			pageName={pageName}
			canonicalUrl={`/rwa/perps/contract/${canonicalContract}`}
		>
			<RWAPerpsCoinPage coin={coin} />
		</Layout>
	)
}

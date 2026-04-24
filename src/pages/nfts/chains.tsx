import type { InferGetStaticPropsType } from 'next'
import { fetchAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
import { NftsByChain, type INftChainRow } from '~/containers/Nft/NftsByChain'
import Layout from '~/layout'
import { chainIconUrl } from '~/utils/icons'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`nfts/chains`, async () => {
	const data = await fetchAdapterChainMetrics({
		adapterType: 'nft-volume',
		chain: 'All',
		dataType: 'dailyVolume'
	})

	if (!data) throw new Error('Missing page data for route=/nfts/chains')

	const chains: INftChainRow[] = (data.protocols ?? []).map((chain) => {
		return {
			name: chain.displayName,
			logo: chainIconUrl(chain.slug),
			total24h: chain.total24h ?? 0
		}
	})

	return {
		props: { chains: chains.sort((a, b) => b.total24h - a.total24h) },
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', 'NFT Volume']

export default function NftsOnAllChains(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="NFT Volume by Chain - DefiLlama"
			description="Compare NFT trading volume by chain. Track 24h volume rankings across blockchains."
			canonicalUrl={`/nfts/chains`}
			pageName={pageName}
		>
			<NftsByChain {...props} />
		</Layout>
	)
}

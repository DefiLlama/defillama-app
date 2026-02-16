import type { InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { fetchNftsVolumeByChain } from '~/containers/Nft/api'
import { NftsByChain, type INftChainRow } from '~/containers/Nft/NftsByChain'
import Layout from '~/layout'
import { chainIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const getMetadataChainKey = (chain: string): string => {
	if (chain === 'optimism') return 'op-mainnet'
	if (chain === 'immutablex') return 'immutable-zkevm'
	return chain
}

export const getStaticProps = withPerformanceLogging(`nfts/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const data = await fetchNftsVolumeByChain()

	if (!data) return { notFound: true }

	const chains: INftChainRow[] = Object.entries(data).map(([chain, total24h]) => {
		const metadataChainKey = getMetadataChainKey(chain)
		const name = metadataCache.chainMetadata[metadataChainKey]?.name ?? chain

		return {
			name,
			logo: chainIconUrl(chain),
			total24h
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
			title="NFTs Volume by Chain - DefiLlama"
			description={`NFTs volume by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`nfts volume by chain, defi nfts volume`}
			canonicalUrl={`/nfts/chains`}
			pageName={pageName}
		>
			<NftsByChain {...props} />
		</Layout>
	)
}

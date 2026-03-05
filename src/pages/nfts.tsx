import type { InferGetStaticPropsType } from 'next'
import { NftsCollectionTable } from '~/containers/Nft/NftsCollectionTable'
import { getNFTData } from '~/containers/Nft/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('nfts', async () => {
	const data = await getNFTData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['NFTs Collections']

export default function NFTHomePage(props: InferGetStaticPropsType<typeof getStaticProps>) {
		return (
		<Layout
			title="NFT Collections Rankings by Market Cap & Floor Price - DefiLlama"
			description="Track top NFT collections by market cap, floor price, and trading volume. Real-time NFT analytics for CryptoPunks, Bored Apes, and 1000+ collections. Compare 24h volume, holder counts, and supply metrics."
			canonicalUrl={`/nfts`}
			pageName={pageName}
		>
			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

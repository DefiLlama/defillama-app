import { maxAgeForNext } from '~/api'
import { getNFTData } from '~/api/categories/nfts'
import Layout from '~/layout'
import { NftsCollectionTable } from '~/components/Table'
import { Header } from '~/Theme'

export async function getStaticProps() {
	const data = await getNFTData()
	// const chainData = await getNFTChainsData()

	return {
		props: {
			...data
			// chainData
		},
		revalidate: maxAgeForNext([22])
	}
}

export default function NFTHomePage(props) {
	console.log(props.collections)
	return (
		<Layout title="NFTs - DefiLlama" defaultSEO>
			<Header>NFT Collections</Header>

			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

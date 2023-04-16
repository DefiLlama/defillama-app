import { maxAgeForNext } from '~/api'
import { getNFTData } from '~/api/categories/nfts'
import Layout from '~/layout'
import { NftsCollectionTable } from '~/components/Table'
import { useScrollToTop } from '~/hooks'
import { ProtocolsChainsSearch } from '~/components/Search'

export async function getStaticProps() {
	const data = await getNFTData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
}

export default function NFTHomePage(props) {
	useScrollToTop()
	return (
		<Layout title="NFTs - DefiLlama" defaultSEO>
			<ProtocolsChainsSearch
				step={{
					category: 'Home',
					name: 'NFT Collections',
					route: '/',
					hideOptions: true
				}}
			/>

			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

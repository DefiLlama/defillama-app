import { maxAgeForNext } from '~/api'
import { getNFTData } from '~/api/categories/nfts'
import Layout from '~/layout'
import { NftsCollectionTable } from '~/components/Table'
import { useScrollToTop } from '~/hooks'

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
			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

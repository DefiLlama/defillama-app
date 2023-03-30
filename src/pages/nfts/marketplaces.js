import Layout from '~/layout'
import { NftsmarketplaceTable } from '~/components/Table'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'

export async function getStaticProps() {
	const data = await getNFTMarketplacesData()

	return {
		props: {
			data
		},
		revalidate: maxAgeForNext([22])
	}
}

function Marketplaces(props) {
	return (
		<Layout title="NFT Marketplaces - DefiLlama" defaultSEO>
			<NftsmarketplaceTable {...props} />
		</Layout>
	)
}

export default Marketplaces

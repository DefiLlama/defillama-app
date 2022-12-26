import NFTDashboardPage from '~/components/NFTDashboardPage'
import { maxAgeForNext } from '~/api'
import { getNFTChainsData, getNFTData } from '~/api/categories/nfts'

export async function getStaticProps() {
	const data = await getNFTData()
	const chainData = await getNFTChainsData()

	return {
		props: {
			...data,
			chainData
		},
		revalidate: maxAgeForNext([22])
	}
}

export default function NFTHomePage(props) {
	return <NFTDashboardPage title="DefiLlama - NFT Dashboard" {...props} />
}

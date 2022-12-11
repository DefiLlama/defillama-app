import NFTDashboardPage from '~/components/NFTDashboardPage'
import { addMaxAgeHeaderForNext } from '~/api'
import { getNFTChainsData, getNFTData } from '~/api/categories/nfts'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getNFTData()
	const chainData = await getNFTChainsData()

	return {
		props: {
			...data,
			chainData
		}
	}
}

export default function NFTHomePage(props) {
	return <NFTDashboardPage title="DefiLlama - NFT Dashboard" {...props} />
}

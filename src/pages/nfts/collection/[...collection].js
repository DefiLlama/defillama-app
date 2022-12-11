import NFTCollectionPage from '~/components/NFTCollectionPage'
import { getColor } from '~/utils/getColor'
import { addMaxAgeHeaderForNext } from '~/api'
import { getNFTCollection, getNFTCollectionChartData, getNFTStatistics } from '~/api/categories/nfts'

export const getServerSideProps = async ({
	params: {
		collection: [slug]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const collection = await getNFTCollection(slug)
	const chart = await getNFTCollectionChartData(slug)
	const statistics = await getNFTStatistics(chart)
	const backgroundColor = await getColor(collection.slug, collection.logo)

	return {
		props: {
			collection,
			chart,
			statistics,
			title: collection ? `${collection.name} - DefiLlama` : `DefiLlama - NFT Dashboard`,
			backgroundColor
		}
	}
}

export default function Collection(props) {
	return <NFTCollectionPage {...props} />
}

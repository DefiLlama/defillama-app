import NFTCollectionPage from '~/components/NFTCollectionPage'
import { getColor } from '~/utils/getColor'
import { revalidate } from '~/api'
import { getNFTCollection, getNFTCollections, getNFTCollectionChartData, getNFTStatistics } from '~/api/categories/nfts'

export async function getStaticProps({
	params: {
		collection: [slug]
	}
}) {
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
		},
		revalidate: revalidate()
	}
}

// export async function getStaticPaths() {
// 	const collections = await getNFTCollections()
// 	const paths = collections.slice(0, 20).map(({ slug }) => ({
// 		params: { collection: [slug] }
// 	}))

// 	return { paths, fallback: 'blocking' }
// }

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Collection(props) {
	return <NFTCollectionPage {...props} />
}

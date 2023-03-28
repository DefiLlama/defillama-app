import { maxAgeForNext } from '~/api'
import { getNFTCollection } from '~/api/categories/nfts'
import { NFTCollectionContainer } from '~/containers/Nft/Collection'

export async function getStaticProps({
	params: {
		collection: [slug]
	}
}) {
	const data = await getNFTCollection(slug)

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
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
	return <NFTCollectionContainer {...props} />
}

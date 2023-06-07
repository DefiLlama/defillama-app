import { maxAgeForNext } from '~/api'
import { getNFTCollection } from '~/api/categories/nfts'
import { NFTCollectionContainer } from '~/containers/Nft/Collection'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'nfts/collection/[...collection]',
	async ({
		params: {
			collection: [slug]
		}
	}) => {
		if (!slug.startsWith('0x')) {
			return {
				notFound: true
			}
		}

		const data = await getNFTCollection(slug)

		return {
			props: {
				...data
			},
			revalidate: 300
		}
	}
)

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

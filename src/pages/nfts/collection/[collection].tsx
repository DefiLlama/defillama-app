import { useRouter } from 'next/router'
import { NFTCollectionContainer } from '~/containers/Nft/Collection'
import Layout from '~/layout'

export default function Collection(props) {
	const router = useRouter()
	const collection =
		typeof router.query.collection === 'string'
			? router.query.collection
			: Array.isArray(router.query.collection)
				? router.query.collection[0]
				: ''
	const title = collection ? `${collection} NFT Collection - DefiLlama` : 'NFT Collection - DefiLlama'
	const description = collection
		? `NFT collection dashboard for ${collection}, including collection analytics and on-chain details on DefiLlama.`
		: 'NFT collection dashboard with collection analytics and on-chain details on DefiLlama.'
	const canonicalUrl = router.isReady && collection ? `/nfts/collection/${collection}` : '/nfts/collection'
	return (
		<Layout title={title} description={description} keywords="" canonicalUrl={canonicalUrl}>
			<NFTCollectionContainer {...props} />
		</Layout>
	)
}

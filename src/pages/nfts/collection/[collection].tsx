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
	const canonicalUrl = router.isReady && collection ? `/nfts/collection/${collection}` : '/nfts/collection'
	return (
		<Layout
			title="NFT Collection - DefiLlama"
			description=""
			keywords=""
			canonicalUrl={canonicalUrl}
		>
			<NFTCollectionContainer {...props} />
		</Layout>
	)
}

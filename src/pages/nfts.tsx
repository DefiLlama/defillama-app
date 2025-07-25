import { maxAgeForNext } from '~/api'
import { getNFTData } from '~/api/categories/nfts'
import { NFTsSearch } from '~/components/Search/NFTs'
import { NftsCollectionTable } from '~/components/Table/Nfts/Collections'
import { useScrollToTop } from '~/hooks'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('nfts', async () => {
	const data = await getNFTData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function NFTHomePage(props) {
	useScrollToTop()
	return (
		<Layout title="NFTs - DefiLlama" defaultSEO>
			<NFTsSearch />

			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

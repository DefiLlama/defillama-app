import { maxAgeForNext } from '~/api'
import { getNFTData } from '~/api/categories/nfts'
import { NftsCollectionTable } from '~/components/Table/Nfts/Collections'
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

const pageName = ['NFTs Collections']

export default function NFTHomePage(props) {
	return (
		<Layout title="NFTs Collections - DefiLlama" pageName={pageName}>
			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

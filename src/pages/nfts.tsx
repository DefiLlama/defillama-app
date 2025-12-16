import { maxAgeForNext } from '~/api'
import { NftsCollectionTable } from '~/components/Table/Nfts/Collections'
import { getNFTData } from '~/containers/Nft/queries'
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
		<Layout
			title="NFTs Collections - DefiLlama"
			description={`Track NFTs collections floor price, 24h volume and total supply. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`nfts collections, nfts on blockchain`}
			canonicalUrl={`/nfts`}
			pageName={pageName}
		>
			<NftsCollectionTable data={props.collections || []} />
		</Layout>
	)
}

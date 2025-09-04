import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { getTotalStakedByChain } from '~/containers/TotalStaked/queries'
import { StakedProtocolsTVLByChain } from '~/containers/TotalStaked/StakedByChain'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	return { paths: [], fallback: 'blocking' }
}

export const getStaticProps = withPerformanceLogging(
	`total-staked/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		const chain = slug(params.chain)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		if (!metadataCache.chainMetadata[chain]) {
			return { notFound: true }
		}

		const data = await getTotalStakedByChain({ chain: metadataCache.chainMetadata[chain].name })

		if (!data) return { notFound: true }

		return {
			props: data,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['Protocols', 'ranked by', 'Total Value Staked']

export default function TotalStakedByChain(props) {
	return (
		<Layout
			title="Total Staked - DefiLlama"
			description={`Total Staked by Protocol on ${props.chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`total value staked by protocol on ${props.chain}`}
			canonicalUrl={`/total-staked/chain/${props.chain}`}
			pageName={pageName}
		>
			<StakedProtocolsTVLByChain {...props} />
		</Layout>
	)
}

import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { LiquidationsChainPage } from '~/containers/LiquidationsV2/ChainPage'
import { getLiquidationsChainPageData } from '~/containers/LiquidationsV2/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = () => {
	return {
		paths: [],
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	'liquidations/[protocol]/[chain]',
	async ({ params }: GetStaticPropsContext<{ protocol: string; chain: string }>) => {
		if (!params?.protocol || !params?.chain) {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()

		const props = await getLiquidationsChainPageData(params.protocol, params.chain, {
			chainMetadata: metadataModule.default.chainMetadata,
			protocolMetadata: metadataModule.default.protocolMetadata
		})

		if (!props) {
			return { notFound: true }
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function LiquidationsChainRoute(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.protocolName} Liquidations on ${props.chainName} - DefiLlama`}
			description={`Track the latest liquidation positions for ${props.protocolName} on ${props.chainName}.`}
			canonicalUrl={`/liquidations/${props.protocolSlug}/${props.chainSlug}`}
			pageName={['Liquidations', props.protocolName, props.chainName]}
		>
			<LiquidationsChainPage {...props} />
		</Layout>
	)
}

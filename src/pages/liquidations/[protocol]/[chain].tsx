import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { LiquidationsChainPage } from '~/containers/LiquidationsV2/ChainPage'
import { getLiquidationsChainPageData } from '~/containers/LiquidationsV2/queries'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

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

		const props = await getLiquidationsChainPageData(params.protocol, params.chain)

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
			title={`${props.protocol} ${props.chain} Liquidations - DefiLlama`}
			description={`Track the latest liquidation positions for ${props.protocol} on ${props.chain}.`}
			canonicalUrl={`/liquidations/${props.protocol}/${props.chain}`}
			pageName={['Liquidations', props.protocol, props.chain]}
		>
			<LiquidationsChainPage {...props} />
		</Layout>
	)
}

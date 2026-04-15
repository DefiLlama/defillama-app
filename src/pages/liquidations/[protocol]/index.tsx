import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { LiquidationsProtocolPage } from '~/containers/LiquidationsV2/ProtocolPage'
import { getLiquidationsProtocolPageData } from '~/containers/LiquidationsV2/queries'
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
	'liquidations/[protocol]/index',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true }
		}

		const props = await getLiquidationsProtocolPageData(params.protocol)

		if (!props) {
			return { notFound: true }
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function LiquidationsProtocolRoute(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.protocol} Liquidations - DefiLlama`}
			description={`Track the latest liquidation positions for ${props.protocol} across supported chains.`}
			canonicalUrl={`/liquidations/${props.protocol}`}
			pageName={['Liquidations', props.protocol]}
		>
			<LiquidationsProtocolPage {...props} />
		</Layout>
	)
}

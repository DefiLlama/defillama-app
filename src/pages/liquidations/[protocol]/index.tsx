import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import type { LiquidationsProtocolShell } from '~/containers/LiquidationsV2/api.types'
import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { LiquidationsProtocolRouteContent } from '~/containers/LiquidationsV2/RouteContent'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { getLiquidationsProtocolStaticPaths } = await import('~/containers/LiquidationsV2/server/routes')
	const paths = await getLiquidationsProtocolStaticPaths()

	return {
		paths,
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	'liquidations/[protocol]/index',
	async ({
		params
	}: GetStaticPropsContext<{ protocol: string }>): Promise<
		{ props: LiquidationsProtocolShell; revalidate: number } | { notFound: true }
	> => {
		if (!params?.protocol) {
			return { notFound: true }
		}

		const { resolveLiquidationsProtocolParam } = await import('~/containers/LiquidationsV2/server/routes')
		const protocolParam = await resolveLiquidationsProtocolParam(params.protocol)
		if (!protocolParam) {
			return { notFound: true }
		}

		const [{ getLiquidationsProtocolsResponseFromCache }, metadataModule] = await Promise.all([
			import('~/containers/LiquidationsV2/server/dataset.cache'),
			import('~/utils/metadata')
		])
		const [protocolsResponse, protocolMetadataLookup] = [
			await getLiquidationsProtocolsResponseFromCache(),
			createProtocolMetadataLookup(metadataModule.default.protocolMetadata)
		]

		const protocolLinks = [
			{ label: 'Overview', to: '/liquidations' },
			...protocolsResponse.protocols.map((protocolId) => {
				const protocolName = protocolMetadataLookup.get(protocolId)?.displayName ?? protocolId

				return {
					label: protocolName,
					to: `/liquidations/${protocolId}`
				}
			})
		]
		const protocolName = protocolMetadataLookup.get(protocolParam)?.displayName ?? protocolParam

		return {
			props: {
				protocolName,
				protocolSlug: protocolParam,
				protocolLinks,
				chainLinks: [{ label: 'All Chains', to: `/liquidations/${protocolParam}` }]
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function LiquidationsProtocolRoute(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.protocolName} Liquidations - DefiLlama`}
			description={`Track the latest liquidation positions for ${props.protocolName} across supported chains.`}
			canonicalUrl={`/liquidations/${props.protocolSlug}`}
			pageName={['Liquidations', props.protocolName]}
		>
			<LiquidationsProtocolRouteContent shell={props} />
		</Layout>
	)
}

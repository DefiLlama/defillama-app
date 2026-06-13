import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import type { LiquidationsChainShell } from '~/containers/LiquidationsV2/api.types'
import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { LiquidationsChainRouteContent } from '~/containers/LiquidationsV2/RouteContent'
import Layout from '~/layout'
import { slug } from '~/utils'
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
	async ({
		params
	}: GetStaticPropsContext<{ protocol: string; chain: string }>): Promise<
		{ props: LiquidationsChainShell; revalidate: number } | { notFound: true }
	> => {
		if (!params?.protocol || !params?.chain) {
			return { notFound: true }
		}

		const { resolveLiquidationsChainParams } = await import('~/server/routeCache/liquidations')
		const route = await resolveLiquidationsChainParams(params.protocol, params.chain)
		if (!route) {
			return { notFound: true }
		}

		const { protocolId: protocolParam, chainId, metadataCache } = route
		const { getLiquidationsProtocolsResponseFromCache } =
			await import('~/containers/LiquidationsV2/server/dataset.cache')
		const protocolsResponse = await getLiquidationsProtocolsResponseFromCache()
		const protocolMetadataLookup = createProtocolMetadataLookup(metadataCache.protocolMetadata)

		const chainMetadata = metadataCache.chainMetadata[slug(chainId)]
		const chainName = chainMetadata?.name ?? chainId
		const chainParam = slug(chainName)

		const protocolLinks = [
			{ label: 'Overview', to: '/liquidations' },
			...protocolsResponse.protocols.map((protocolId) => {
				const protocolName = protocolMetadataLookup.get(protocolId)?.displayName ?? protocolId

				return {
					label: protocolName,
					to: `/liquidations/${slug(protocolName)}`
				}
			})
		]
		const protocolName = protocolMetadataLookup.get(protocolParam)?.displayName ?? protocolParam

		return {
			props: {
				protocolName,
				protocolSlug: protocolParam,
				chainName,
				chainSlug: chainParam,
				protocolLinks,
				chainLinks: [
					{ label: 'All Chains', to: `/liquidations/${protocolParam}` },
					{ label: chainName, to: `/liquidations/${protocolParam}/${chainParam}` }
				]
			},
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
			<LiquidationsChainRouteContent shell={props} />
		</Layout>
	)
}

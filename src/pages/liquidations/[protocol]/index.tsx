import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import type { LiquidationsProtocolShell } from '~/containers/LiquidationsV2/api.types'
import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { LiquidationsProtocolRouteContent } from '~/containers/LiquidationsV2/RouteContent'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticPaths = async () => {
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const protocolsResponse = await fetchProtocolsList()

	return {
		paths: protocolsResponse.protocols.map((protocolId) => {
			return { params: { protocol: protocolId } }
		}),
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

		const protocolParam = slug(params.protocol)

		const protocolsResponse = await fetchProtocolsList()
		if (!protocolsResponse.protocols.includes(protocolParam)) {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')
		const protocolMetadataLookup = createProtocolMetadataLookup(metadataModule.default.protocolMetadata)

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

import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import type { LiquidationsChainShell } from '~/containers/LiquidationsV2/api.types'
import { LiquidationsChainRouteContent } from '~/containers/LiquidationsV2/RouteContent'
import Layout from '~/layout'
import { slug } from '~/utils'
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
	async ({
		params
	}: GetStaticPropsContext<{ protocol: string; chain: string }>): Promise<
		{ props: LiquidationsChainShell; revalidate: number } | { notFound: true }
	> => {
		if (!params?.protocol || !params?.chain) {
			return { notFound: true }
		}

		const protocolParam = slug(params.protocol)
		const chainParam = slug(params.chain)

		const protocolsResponse = await fetchProtocolsList()
		if (!protocolsResponse.protocols.includes(protocolParam)) {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')

		const chainMetadata = metadataModule.default.chainMetadata[chainParam]
		if (!chainMetadata) {
			return { notFound: true }
		}

		const liqProtocols = new Set(protocolsResponse.protocols)
		const protocolMetadata = metadataModule.default.protocolMetadata
		const protocolNames: Record<string, string> = Object.create(null)

		for (const id in protocolMetadata) {
			const metadata = protocolMetadata[id]
			if (liqProtocols.has(metadata.name)) {
				protocolNames[metadata.name] = metadata.displayName ?? id
			}
		}

		const protocolLinks = [
			{ label: 'Overview', to: '/liquidations' },
			...protocolsResponse.protocols.map((protocolId) => ({
				label: protocolNames[protocolId],
				to: `/liquidations/${protocolId}`
			}))
		]

		return {
			props: {
				protocolName: protocolNames[protocolParam],
				protocolSlug: protocolParam,
				chainName: chainMetadata.name,
				chainSlug: chainParam,
				protocolLinks,
				chainLinks: [
					{ label: 'All Chains', to: `/liquidations/${protocolParam}` },
					{ label: chainMetadata.name, to: `/liquidations/${protocolParam}/${chainParam}` }
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

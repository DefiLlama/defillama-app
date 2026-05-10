import type { InferGetStaticPropsType } from 'next'
import { fetchProtocolsList } from '~/containers/LiquidationsV2/api'
import type { LiquidationsOverviewShell } from '~/containers/LiquidationsV2/api.types'
import { createProtocolMetadataLookup } from '~/containers/LiquidationsV2/protocolMetadata'
import { LiquidationsOverviewRouteContent } from '~/containers/LiquidationsV2/RouteContent'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'liquidations/index',
	async (): Promise<{
		props: LiquidationsOverviewShell
		revalidate: number
	}> => {
		const metadataModule = await import('~/utils/metadata')
		const protocolsResponse = await fetchProtocolsList()
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

		return {
			props: { protocolLinks },
			revalidate: maxAgeForNext([22])
		}
	}
)

export default function LiquidationsOverviewPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="DeFi Liquidations Dashboard - DefiLlama"
			description="Track the latest liquidation positions across DeFi lending protocols and chains."
			canonicalUrl="/liquidations"
			pageName={['Liquidations']}
		>
			<LiquidationsOverviewRouteContent shell={props} />
		</Layout>
	)
}

import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/charts/ProtocolChart'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocol, getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/derivatives-aggregator/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata || !metadata.perpsAggregators) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData, pageStyles] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				type: 'derivatives-aggregator',
				protocol: metadata.name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}),
			getProtocolPageStyles(metadata.name)
		])

		const metrics = getProtocolMetrics({ protocolData, metadata })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				pageStyles,
				metrics,
				adaptorChains: adapterData?.chains ?? [],
				adaptorVersions: adapterData?.linkedProtocols?.slice(1) ?? []
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			pageStyles={props.pageStyles}
			tab="perps-aggregators"
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="grid grid-cols-2 rounded-md">
					<DimensionProtocolChartByType
						chartType="overview"
						protocolName={slug(props.name)}
						adapterType="derivatives-aggregator"
					/>
					{props.adaptorChains.length > 1 ? (
						<DimensionProtocolChartByType
							chartType="chain"
							protocolName={slug(props.name)}
							adapterType="derivatives-aggregator"
						/>
					) : null}
					{props.adaptorVersions.length > 1 ? (
						<DimensionProtocolChartByType
							chartType="version"
							protocolName={slug(props.name)}
							adapterType="derivatives-aggregator"
						/>
					) : null}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}

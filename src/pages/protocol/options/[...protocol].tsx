import { getProtocol } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { DimensionProtocolChartByType } from '~/containers/DimensionAdapters/charts/ProtocolChart'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getAdapterProtocolSummary } from '~/containers/DimensionAdapters/queries'
import { getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/options/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata || !metadata.options) {
			return { notFound: true, props: null }
		}

		const [protocolData, adapterData, pageStyles] = await Promise.all([
			getProtocol(protocol),
			getAdapterProtocolSummary({
				type: 'options',
				protocol: metadata.name,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}),
			getProtocolPageStyles(metadata.name)
		])

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				pageStyles,
				metadata,
				adaptorChains: adapterData?.chains ?? [],
				adaptorVersions: adapterData?.linkedProtocols ?? []
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
			metadata={props.metadata}
			pageStyles={props.pageStyles}
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="grid grid-cols-2 rounded-md">
					<DimensionProtocolChartByType
						chartType="chain"
						protocolName={slug(props.name)}
						type="options"
						overviewChart
					/>
					{props.adaptorChains.length > 0 ? (
						<DimensionProtocolChartByType chartType="chain" protocolName={slug(props.name)} type="options" />
					) : null}
					{props.adaptorVersions.length > 0 ? (
						<DimensionProtocolChartByType chartType="version" protocolName={slug(props.name)} type="options" />
					) : null}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}

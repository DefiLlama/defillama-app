import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol, getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { UnlocksCharts } from '~/containers/ProtocolOverview/Emissions'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/unlocks/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata || !metadata.emissions) {
			return { notFound: true, props: null }
		}

		const [protocolData, pageStyles] = await Promise.all([getProtocol(protocol), getProtocolPageStyles(metadata.name)])

		const metrics = getProtocolMetrics({ protocolData, metadata })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				pageStyles,
				metrics
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			pageStyles={props.pageStyles}
			tab="unlocks"
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<UnlocksCharts protocolName={props.name} />
			</div>
		</ProtocolOverviewLayout>
	)
}

import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol, getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { ForksData } from '~/containers/ProtocolOverview/Forks'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/forks/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata || !metadata.forks) {
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
			tab="forks"
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<ForksData protocolName={props.name} />
			</div>
		</ProtocolOverviewLayout>
	)
}

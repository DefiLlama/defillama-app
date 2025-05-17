import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol, getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { GovernanceData } from '~/containers/ProtocolOverview/Governance'
import { maxAgeForNext } from '~/api'
import {
	PROTOCOL_GOVERNANCE_COMPOUND_API,
	PROTOCOL_GOVERNANCE_SNAPSHOT_API,
	PROTOCOL_GOVERNANCE_TALLY_API
} from '~/constants'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/governance/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata || !metadata.governance) {
			return { notFound: true, props: null }
		}

		const [protocolData, pageStyles] = await Promise.all([getProtocol(protocol), getProtocolPageStyles(metadata.name)])

		const metrics = getProtocolMetrics({ protocolData, metadata })

		const governanceApis = (
			protocolData.governanceID?.map((gid) =>
				gid.startsWith('snapshot:')
					? `${PROTOCOL_GOVERNANCE_SNAPSHOT_API}/${gid.split('snapshot:')[1].replace(/(:|’|')/g, '/')}.json`
					: gid.startsWith('compound:')
					? `${PROTOCOL_GOVERNANCE_COMPOUND_API}/${gid.split('compound:')[1].replace(/(:|’|')/g, '/')}.json`
					: gid.startsWith('tally:')
					? `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.split('tally:')[1].replace(/(:|’|')/g, '/')}.json`
					: `${PROTOCOL_GOVERNANCE_TALLY_API}/${gid.replace(/(:|’|')/g, '/')}.json`
			) ?? []
		).map((g) => g.toLowerCase())

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				pageStyles,
				metrics,
				governanceApis: governanceApis.filter((x) => !!x)
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
			tab="governance"
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<GovernanceData apis={props.governanceApis} />
			</div>
		</ProtocolOverviewLayout>
	)
}

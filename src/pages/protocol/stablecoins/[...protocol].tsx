import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocol, getProtocolMetrics, getProtocolPageStyles } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { StablecoinInfo } from '~/containers/ProtocolOverview/Stablecoin'
import { slug } from '~/utils'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/stablecoins/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const [protocolData, pageStyles] = await Promise.all([getProtocol(protocol), getProtocolPageStyles(metadata.name)])

		const metrics = getProtocolMetrics({ protocolData, metadata })

		if (!protocolData.stablecoins?.length) {
			return { notFound: true, props: null }
		}

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				pageStyles,
				metrics,
				assetName: protocolData.stablecoins[0]
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
			tab="stablecoins"
		>
			<div className="bg-[var(--cards-bg)] rounded-md">
				<StablecoinInfo assetName={props.assetName} />
			</div>
		</ProtocolOverviewLayout>
	)
}

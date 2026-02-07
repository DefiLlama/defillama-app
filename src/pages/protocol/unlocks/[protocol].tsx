import { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { UnlocksCharts } from '~/containers/ProtocolOverview/Emissions'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { getTokenMarketDataFromCgChart } from '~/containers/Unlocks/tokenMarketData'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'protocol/unlocks/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}
		const { protocol } = params
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].emissions) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const emissions = await getProtocolEmissons(normalizedName).catch(() => null as any)
		const geckoId = emissions?.geckoId ?? emissions?.meta?.gecko_id ?? null
		const initialTokenMarketData = geckoId ? await getTokenMarketDataFromCgChart(geckoId) : null

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData),
				emissions,
				initialTokenMarketData
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
			tab="unlocks"
			warningBanners={props.warningBanners}
		>
			<div className="flex flex-col gap-2 rounded-md">
				<UnlocksCharts
					protocolName={props.name}
					initialData={props.emissions}
					initialTokenMarketData={props.initialTokenMarketData}
					disableClientTokenStatsFetch
				/>
			</div>
		</ProtocolOverviewLayout>
	)
}

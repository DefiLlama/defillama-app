import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { LinkPreviewCard } from '~/components/SEO'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { EmissionsByProtocol } from '~/containers/Unlocks/EmissionsByProtocol'
import {
	calculateTotalUnlockValue,
	getEventCountdown,
	getProtocolUnlocksStaticPropsData
} from '~/containers/Unlocks/protocolUnlocksStaticProps'
import Layout from '~/layout'
import { formattedNum, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'unlocks/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default

		const { emissions, tokenSymbol, initialTokenMarketData } = await getProtocolUnlocksStaticPropsData(
			params.protocol,
			metadataCache.tokenlist
		)

		if (!emissions) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const noUpcomingEvent = emissions?.upcomingEvent?.[0]?.timestamp == null
		if ((emissions.chartData?.documented?.length ?? 0) === 0 && (emissions.chartData?.realtime?.length ?? 0) === 0) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}
		const resolvedTokenSymbol = tokenSymbol ?? emissions.tokenPrice?.symbol ?? null
		const seoTitle = `${emissions.name} Token Unlocks & Vesting Schedule - DefiLlama`
		const seoDescription = `View ${emissions.name}${resolvedTokenSymbol ? ` (${resolvedTokenSymbol})` : ''} token unlock schedule, vesting charts, and cliff events. Track upcoming emissions on DefiLlama.`

		return {
			props: {
				emissions,
				totalUnlockValue: calculateTotalUnlockValue(emissions),
				eventCountdown: getEventCountdown(emissions?.upcomingEvent?.[0]?.timestamp),
				noUpcomingEvent,
				initialTokenMarketData,
				seoTitle,
				seoDescription
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({
	emissions,
	totalUnlockValue,
	eventCountdown,
	noUpcomingEvent,
	initialTokenMarketData,
	seoTitle,
	seoDescription
}: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout title={seoTitle} description={seoDescription} canonicalUrl={`/unlocks/${emissions.name}`}>
			<LinkPreviewCard
				unlockPage={true}
				cardName={emissions.name}
				logo={tokenIconUrl(emissions.name)}
				unlockAmount={`$${formattedNum(totalUnlockValue)}`}
				tvl={noUpcomingEvent ? 'No Events' : eventCountdown}
			/>
			<EmissionsByProtocol
				data={emissions}
				isEmissionsPage
				initialTokenMarketData={initialTokenMarketData}
				disableClientTokenStatsFetch
			/>
		</Layout>
	)
}

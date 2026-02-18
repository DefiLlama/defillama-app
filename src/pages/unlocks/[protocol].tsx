import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
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
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'unlocks/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
		}

		const { emissions, initialTokenMarketData } = await getProtocolUnlocksStaticPropsData(params.protocol)

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

		return {
			props: {
				emissions,
				totalUnlockValue: calculateTotalUnlockValue(emissions),
				eventCountdown: getEventCountdown(emissions?.upcomingEvent?.[0]?.timestamp),
				noUpcomingEvent,
				initialTokenMarketData
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
	initialTokenMarketData
}) {
	return (
		<Layout
			title={`${emissions.name} ${emissions.tokenPrice.symbol} Token Unlocks & Vesting Schedules - DefiLlama`}
			description={`Track upcoming ${emissions.name} token unlocks, detailed vesting schedules, and key emission data on DefiLlama. Stay informed on ${emissions.tokenPrice.symbol} release events and supply changes.`}
			keywords={`${emissions.name} ${emissions.tokenPrice.symbol} token unlocks, vesting schedules, emission data, DefiLlama, ${emissions.tokenPrice.symbol}, ${emissions.name}, ${emissions.tokenPrice.symbol} Tokenomics, ${emissions.tokenPrice.symbol} Unlocks, ${emissions.tokenPrice.symbol} Vesting Schedule, ${emissions.name} Unlocks, ${emissions.name} Vesting Schedule, ${emissions.name} Tokenomics`}
			canonicalUrl={`/unlocks/${emissions.name}`}
		>
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

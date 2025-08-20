import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getProtocolEmissons } from '~/api/categories/protocols'
import { SEO } from '~/components/SEO'
import { Emissions } from '~/containers/ProtocolOverview/Emissions/index'
import Layout from '~/layout'
import { formattedNum, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const calculateTotalUnlockValue = (emissions) => {
	if (!emissions.upcomingEvent || !emissions.tokenPrice.price) return 0

	const totalAmount = emissions.upcomingEvent?.reduce((sum, event) => {
		const eventTotal = event?.noOfTokens?.reduce((eventSum, amount) => eventSum + amount, 0)
		return sum + eventTotal
	}, 0)

	return totalAmount * emissions.tokenPrice.price
}

const getEventCountdown = (timestamp: number): string => {
	const now = Math.floor(Date.now() / 1000)
	const timeLeft = timestamp - now

	const hoursLeft = Math.floor(timeLeft / 3600)
	const daysLeft = Math.floor(hoursLeft / 24)

	if (daysLeft >= 1) {
		return `in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`
	}

	return `in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`
}

export const getStaticProps = withPerformanceLogging(
	'unlocks/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const emissions = await getProtocolEmissons(protocol)
		const noUpcomingEvent = emissions.upcomingEvent[0].timestamp === null
		if (emissions.chartData?.documented?.length === 0 && emissions.chartData?.realtime?.length === 0) {
			return {
				notFound: true
			}
		}

		return {
			props: {
				emissions,
				totalUnlockValue: calculateTotalUnlockValue(emissions),
				eventCountdown: getEventCountdown(emissions.upcomingEvent[0]?.timestamp),
				noUpcomingEvent
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocol({ emissions, totalUnlockValue, eventCountdown, noUpcomingEvent }) {
	return (
		<Layout title={`${emissions.name} Unlocks - DefiLlama`}>
			<SEO
				unlockPage={true}
				cardName={emissions.name}
				symbol={emissions.tokenPrice.symbol}
				logo={tokenIconUrl(emissions.name)}
				unlockAmount={`$${formattedNum(totalUnlockValue)}`}
				tvl={noUpcomingEvent ? 'No Events' : eventCountdown}
			/>

			<Emissions data={emissions} isEmissionsPage />
		</Layout>
	)
}

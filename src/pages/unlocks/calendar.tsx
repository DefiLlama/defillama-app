import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissionsWithHistory } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { CalendarView } from '~/components/Unlocks/CalendarView'
import { Announcement } from '~/components/Announcement'

export const getStaticProps = withPerformanceLogging('unlocks-calendar', async () => {
	const data = await getAllProtocolEmissionsWithHistory()
	const unlocksData: { [date: string]: { totalValue: number; events: any[] } } = {}

	data?.forEach((protocol) => {
		if (!protocol.events || protocol.tPrice === null || protocol.tPrice === undefined) {
			return
		}

		const protocolUnlocks: { [date: string]: { value: number; details: string[] } } = {}

		protocol.events.forEach((event) => {
			if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
				return
			}

			const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
			if (totalTokens === 0) {
				return
			}

			const valueUSD = totalTokens * protocol.tPrice
			const dateStr = new Date(event.timestamp * 1000).toISOString().split('T')[0]

			if (!protocolUnlocks[dateStr]) {
				protocolUnlocks[dateStr] = {
					value: 0,
					details: []
				}
			}

			protocolUnlocks[dateStr].value += valueUSD
			protocolUnlocks[dateStr].details.push(event.description || 'Token unlock')
		})

		Object.entries(protocolUnlocks).forEach(([dateStr, protocolData]) => {
			if (!unlocksData[dateStr]) {
				unlocksData[dateStr] = {
					totalValue: 0,
					events: []
				}
			}

			unlocksData[dateStr].totalValue += protocolData.value
			unlocksData[dateStr].events.push({
				protocol: protocol.name,
				value: protocolData.value,
				details: protocolData.details.join(', ')
			})
		})
	})

	Object.keys(unlocksData).forEach((date) => {
		unlocksData[date].events.sort((a, b) => b.value - a.value)
	})

	return {
		props: {
			unlocksData
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function UnlocksCalendar({ unlocksData }) {
	return (
		<Layout title={`Token Unlocks Calendar - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="text-[var(--blue)] underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="flex items-center p-3 bg-[var(--cards-bg)] rounded-md">
				<h1 className="text-xl font-semibold text-center">Token Unlocks Calendar</h1>
			</div>

			<div className="bg-[var(--cards-bg)] rounded-md p-3">
				<CalendarView unlocksData={unlocksData} />
			</div>
		</Layout>
	)
}

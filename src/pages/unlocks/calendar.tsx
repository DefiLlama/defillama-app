import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissionsWithHistory } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { CalendarView } from '~/components/Unlocks/CalendarView'
import { Announcement } from '~/components/Announcement'
import dayjs from 'dayjs'

const determineUnlockType = (
	event: { timestamp: number; noOfTokens: number[]; description?: string },
	allEventsForProtocol: Array<{ timestamp: number; noOfTokens: number[]; description?: string }>
): string => {
	const futureEvents = allEventsForProtocol
		.filter((e) => e.timestamp && e.timestamp > dayjs().unix())
		.sort((a, b) => a.timestamp - b.timestamp)

	const diffsInDays: number[] = []
	for (let i = 0; i < futureEvents.length - 1; i++) {
		const diffSeconds = futureEvents[i + 1].timestamp - futureEvents[i].timestamp
		diffsInDays.push(diffSeconds / (60 * 60 * 24))
	}

	const currentEventIndex = futureEvents.findIndex((e) => e.timestamp === event.timestamp)

	if (currentEventIndex !== -1 && currentEventIndex < futureEvents.length - 1) {
		const diffToNextEventDays = diffsInDays[currentEventIndex]

		if (diffToNextEventDays > 6.5 && diffToNextEventDays < 7.5) {
			return 'Weekly'
		}

		if (diffToNextEventDays > 28 && diffToNextEventDays < 32) {
			return 'Monthly'
		}

		if (diffToNextEventDays > 88 && diffToNextEventDays < 92) {
			return 'Quarterly'
		}
	}

	return ''
}

export const getStaticProps = withPerformanceLogging('unlocks-calendar', async () => {
	const data = await getAllProtocolEmissionsWithHistory()
	const unlocksData: { [date: string]: { totalValue: number; events: Array<any> } } = {}

	data?.forEach((protocol) => {
		if (!protocol.events || protocol.tPrice === null || protocol.tPrice === undefined) {
			return
		}

		const processedEvents: Array<{
			dateStr: string
			value: number
			details: string
			unlockType: string
		}> = []

		const validEvents = protocol.events.filter(
			(event) => event.timestamp !== null && event.noOfTokens && event.noOfTokens.length > 0
		)

		validEvents.forEach((event) => {
			const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
			if (totalTokens === 0) {
				return
			}

			const valueUSD = totalTokens * protocol.tPrice
			const dateStr = new Date(event.timestamp * 1000).toISOString().split('T')[0]
			const unlockType = determineUnlockType(event, validEvents)

			processedEvents.push({
				dateStr: dateStr,
				value: valueUSD,
				details: event.description || 'Token unlock',
				unlockType: unlockType
			})
		})

		const protocolUnlocksByDate: { [date: string]: { value: number; details: string[]; unlockTypes: string[] } } = {}
		processedEvents.forEach((processedEvent) => {
			if (!protocolUnlocksByDate[processedEvent.dateStr]) {
				protocolUnlocksByDate[processedEvent.dateStr] = { value: 0, details: [], unlockTypes: [] }
			}
			protocolUnlocksByDate[processedEvent.dateStr].value += processedEvent.value
			protocolUnlocksByDate[processedEvent.dateStr].details.push(processedEvent.details)
			protocolUnlocksByDate[processedEvent.dateStr].unlockTypes.push(processedEvent.unlockType)
		})

		Object.entries(protocolUnlocksByDate).forEach(([dateStr, dailyData]) => {
			if (!unlocksData[dateStr]) {
				unlocksData[dateStr] = {
					totalValue: 0,
					events: []
				}
			}
			unlocksData[dateStr].totalValue += dailyData.value
			unlocksData[dateStr].events.push({
				protocol: protocol.name,
				value: dailyData.value,
				details: dailyData.details.join(', '),
				unlockType: dailyData.unlockTypes.find((type) => type !== '') || ''
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

			<div className="flex items-center gap-4 flex-wrap">
				<h1 className="text-2xl font-medium">Token Unlocks Calendar</h1>
			</div>

			<div className="bg-white dark:bg-[#090a0b] rounded-lg shadow p-4">
				<CalendarView unlocksData={unlocksData} />
			</div>
		</Layout>
	)
}

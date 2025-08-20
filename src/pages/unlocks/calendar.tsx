import * as React from 'react'
import dayjs from 'dayjs'
import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissionsWithHistory } from '~/api/categories/protocols'
import { Announcement } from '~/components/Announcement'
import { CalendarView } from '~/components/Unlocks/CalendarView'
import type { PrecomputedData, UnlocksData } from '~/components/Unlocks/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const determineUnlockType = (
	event: { timestamp: number; noOfTokens: number[]; description?: string; category?: string },
	allEventsForProtocol: Array<{ timestamp: number; noOfTokens: number[]; description?: string; category?: string }>
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

	const precomputedData = {
		monthlyMaxValues: {} as { [monthKey: string]: number },
		listEvents: {} as { [startDateKey: string]: Array<{ date: string; event: any }> }
	}

	data?.forEach((protocol) => {
		if (!protocol.events || protocol.tPrice === null || protocol.tPrice === undefined) {
			return
		}

		const processedEvents: Array<{
			dateStr: string
			value: number
			details: string
			unlockType: string
			category?: string
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
				unlockType: unlockType,
				category: event.category || ''
			})
		})

		const protocolUnlocksByDate: {
			[date: string]: { value: number; details: string[]; unlockTypes: string[]; category?: string }
		} = {}
		processedEvents.forEach((processedEvent) => {
			if (!protocolUnlocksByDate[processedEvent.dateStr]) {
				protocolUnlocksByDate[processedEvent.dateStr] = { value: 0, details: [], unlockTypes: [] }
			}
			protocolUnlocksByDate[processedEvent.dateStr].value += processedEvent.value
			protocolUnlocksByDate[processedEvent.dateStr].details.push(processedEvent.details)
			protocolUnlocksByDate[processedEvent.dateStr].unlockTypes.push(processedEvent.unlockType)
			protocolUnlocksByDate[processedEvent.dateStr].category = processedEvent.category
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
				unlockType: dailyData.unlockTypes.find((type) => type !== '') || '',
				category: dailyData.category
			})
		})
	})

	Object.keys(unlocksData).forEach((date) => {
		unlocksData[date].events.sort((a, b) => b.value - a.value)
	})

	const currentYear = new Date().getFullYear()
	for (let year = currentYear - 1; year <= currentYear + 2; year++) {
		for (let month = 0; month < 12; month++) {
			const startOfMonth = dayjs().year(year).month(month).startOf('month')
			const endOfMonth = startOfMonth.endOf('month')
			const monthKey = `${year}-${month.toString().padStart(2, '0')}`

			let maxValue = 0
			Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
				const date = dayjs(dateStr)
				if (date.isBetween(startOfMonth.subtract(1, 'day'), endOfMonth.add(1, 'day'))) {
					if (dailyData.totalValue > maxValue) {
						maxValue = dailyData.totalValue
					}
				}
			})
			precomputedData.monthlyMaxValues[monthKey] = maxValue
		}
	}

	const now = dayjs()
	for (let i = 0; i < 6; i++) {
		const startDate = now.add(i * 30, 'days').startOf('day')
		const endDate = startDate.add(30, 'days')
		const startDateKey = startDate.format('YYYY-MM-DD')

		const events: Array<{ date: string; event: any }> = []
		Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			if (date.isBetween(startDate.subtract(1, 'day'), endDate)) {
				dailyData.events.forEach((event) => {
					events.push({ date: dateStr, event })
				})
			}
		})

		events.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
		precomputedData.listEvents[startDateKey] = events
	}

	return {
		props: {
			unlocksData,
			precomputedData
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Token Unlocks Calendar']

export default function UnlocksCalendar({
	unlocksData: initialUnlocksData,
	precomputedData
}: {
	unlocksData: UnlocksData
	precomputedData: PrecomputedData
}) {
	return (
		<Layout title={`Token Unlocks Calendar - DefiLlama`} pageName={pageName}>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<CalendarView initialUnlocksData={initialUnlocksData} precomputedData={precomputedData} />
			</div>
		</Layout>
	)
}

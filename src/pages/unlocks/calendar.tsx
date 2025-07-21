import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissionsWithHistory } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import { useWatchlistManager } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { withPerformanceLogging } from '~/utils/perf'
import { CalendarView } from '~/components/Unlocks/CalendarView'
import { Announcement } from '~/components/Announcement'
import dayjs from 'dayjs'
import type { PrecomputedData } from '~/components/Unlocks/types'

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

interface UnlocksData {
	[date: string]: {
		totalValue: number
		events: Array<{
			protocol: string
			value: number
			details: string
			category?: string
			unlockType: string
		}>
	}
}

export default function UnlocksCalendar({
	unlocksData: initialUnlocksData,
	precomputedData
}: {
	unlocksData: UnlocksData
	precomputedData: PrecomputedData
}) {
	const [showOnlyWatchlist, setShowOnlyWatchlist] = React.useState(false)
	const [showOnlyInsider, setShowOnlyInsider] = React.useState(false)
	const { savedProtocols } = useWatchlistManager('defi')

	const unlocksData = React.useMemo(() => {
		let filteredData = initialUnlocksData
		if (!filteredData) return {}

		if (showOnlyWatchlist || showOnlyInsider) {
			filteredData = {}
			Object.entries(initialUnlocksData).forEach(([date, dailyData]) => {
				let filteredEvents = dailyData.events

				if (showOnlyWatchlist) {
					filteredEvents = filteredEvents.filter((event) => savedProtocols.has(event.protocol))
				}

				if (showOnlyInsider) {
					filteredEvents = filteredEvents.filter((event) => event.category === 'insiders')
				}

				if (filteredEvents.length > 0) {
					filteredData[date] = {
						...dailyData,
						events: filteredEvents,
						totalValue: filteredEvents.reduce((sum, event) => sum + event.value, 0)
					}
				}
			})
		}

		return filteredData
	}, [initialUnlocksData, showOnlyWatchlist, showOnlyInsider, savedProtocols])

	return (
		<Layout title={`Token Unlocks Calendar - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="text-(--blue) underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="flex items-center justify-between gap-2 p-3 bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<h1 className="text-xl font-semibold">Token Unlocks Calendar</h1>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowOnlyWatchlist((prev) => !prev)}
						className="border border-(--form-control-border) p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
					>
						<Icon
							name="bookmark"
							height={16}
							width={16}
							style={{ fill: showOnlyWatchlist ? 'var(--text1)' : 'none' }}
						/>
						{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
					</button>

					<button
						onClick={() => setShowOnlyInsider((prev) => !prev)}
						className="border border-(--form-control-border) p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
					>
						<Icon name="key" height={16} width={16} style={{ fill: showOnlyInsider ? 'var(--text1)' : 'none' }} />
						{showOnlyInsider ? 'Show All' : 'Show Insiders Only'}
					</button>
				</div>
			</div>

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md p-3">
				<CalendarView unlocksData={unlocksData} precomputedData={precomputedData} />
			</div>
		</Layout>
	)
}

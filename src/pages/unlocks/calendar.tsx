import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissionsWithHistory } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import { useWatchlist } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { Icon } from '~/components/Icon'
import { withPerformanceLogging } from '~/utils/perf'
import { CalendarView } from '~/components/Unlocks/CalendarView'
import { Announcement } from '~/components/Announcement'
import dayjs from 'dayjs'

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

	return {
		props: {
			unlocksData
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

export default function UnlocksCalendar({ unlocksData: initialUnlocksData }: { unlocksData: UnlocksData }) {
	const [showOnlyWatchlist, setShowOnlyWatchlist] = React.useState(false)
	const [showOnlyInsider, setShowOnlyInsider] = React.useState(false)
	const { savedProtocols } = useWatchlist()

	const unlocksData = React.useMemo(() => {
		let filteredData = initialUnlocksData
		if (!filteredData) return {}

		if (showOnlyWatchlist || showOnlyInsider) {
			filteredData = {}
			Object.entries(initialUnlocksData).forEach(([date, dailyData]) => {
				let filteredEvents = dailyData.events

				if (showOnlyWatchlist) {
					filteredEvents = filteredEvents.filter((event) => savedProtocols[slug(event.protocol)])
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
					className="text-[var(--blue)] underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="flex items-center justify-between gap-2 p-3 bg-[var(--cards-bg)] rounded-md">
				<h1 className="text-xl font-semibold">Token Unlocks Calendar</h1>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowOnlyWatchlist((prev) => !prev)}
						className="border border-[var(--form-control-border)] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
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
						className="border border-[var(--form-control-border)] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
					>
						<Icon name="key" height={16} width={16} style={{ fill: showOnlyInsider ? 'var(--text1)' : 'none' }} />
						{showOnlyInsider ? 'Show All' : 'Show Insiders Only'}
					</button>
				</div>
			</div>

			<div className="bg-[var(--cards-bg)] rounded-md p-3">
				<CalendarView unlocksData={unlocksData} />
			</div>
		</Layout>
	)
}

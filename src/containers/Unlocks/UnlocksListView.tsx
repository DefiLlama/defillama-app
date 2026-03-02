import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { DailyUnlocks } from './calendarTypes'

interface UnlocksListViewProps {
	events: Array<{ date: Dayjs; event: DailyUnlocks['events'][0] }>
}

export const UnlocksListView: React.FC<UnlocksListViewProps> = ({ events }) => {
	const groupedEventsEntries = React.useMemo(() => {
		const groupedEvents: { [date: string]: Array<DailyUnlocks['events'][0]> } = {}
		for (const { date, event } of events) {
			const dateStr = date.format('YYYY-MM-DD')
			if (!groupedEvents[dateStr]) {
				groupedEvents[dateStr] = []
			}
			groupedEvents[dateStr].push(event)
		}
		return Object.entries(groupedEvents)
	}, [events])

	if (events.length === 0) {
		return (
			<div className="flex min-h-[200px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-8 text-sm text-(--text-secondary)">
				No unlocks found for the next 30 days.
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-2">
			{groupedEventsEntries.map(([dateStr, dailyEvents]) => (
				<div
					key={dateStr}
					className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3"
				>
					<h3 className="font-semibold">
						{dayjs(dateStr).format('dddd, MMMM D, YYYY')}
						{dayjs(dateStr).isSame(dayjs(), 'day') ? (
							<span className="ml-2 text-xs font-normal text-(--link-text)">(Today)</span>
						) : null}
					</h3>
					<div className="flex flex-col gap-1">
						{dailyEvents.map((event, index) => (
							<BasicLink
								key={`${event.protocol}-${event.value}-${index}`}
								href={`/unlocks/${slug(event.protocol)}`}
								target="_blank"
							>
								<div className="flex items-center justify-between gap-2 rounded-md border border-(--cards-border) p-2 hover:bg-(--link-hover-bg)">
									<span className="flex items-center gap-2 text-sm font-medium">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={20} />
										{event.protocol}
									</span>
									<span className="text-sm font-medium text-(--text-secondary)">{formattedNum(event.value, true)}</span>
								</div>
							</BasicLink>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

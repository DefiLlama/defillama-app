import * as React from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { DailyUnlocks } from '../types'

interface UnlocksListViewProps {
	events: Array<{ date: Dayjs; event: DailyUnlocks['events'][0] }>
}

export const UnlocksListView: React.FC<UnlocksListViewProps> = ({ events }) => {
	if (events.length === 0) {
		return <div className="p-8 text-center text-lg text-(--text-secondary)">No unlocks found for the next 30 days.</div>
	}

	const groupedEvents: { [date: string]: Array<DailyUnlocks['events'][0]> } = {}
	events.forEach(({ date, event }) => {
		const dateStr = date.format('YYYY-MM-DD')
		if (!groupedEvents[dateStr]) {
			groupedEvents[dateStr] = []
		}
		groupedEvents[dateStr].push(event)
	})

	return (
		<div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto rounded border border-(--divider) bg-(--bg-glass) p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-(--bg-glass) [&::-webkit-scrollbar-thumb]:bg-(--blue) [&::-webkit-scrollbar-track]:bg-transparent">
			{Object.entries(groupedEvents).map(([dateStr, dailyEvents], index) => (
				<div key={dateStr} className={`py-2 ${index > 0 ? 'border-t border-(--divider)' : ''}`}>
					<h3 className="sticky top-0 z-10 mb-3 rounded-t-md border-b border-(--divider) bg-(--bg-card) px-3 py-2 text-base font-semibold text-(--text-primary)">
						{dayjs(dateStr).format('dddd, MMMM D, YYYY')}{' '}
						{dayjs(dateStr).isSame(dayjs(), 'day') && (
							<span className="ml-2 text-xs font-normal text-(--blue)">(Today)</span>
						)}
					</h3>
					<div className="flex flex-col gap-2 px-3">
						{dailyEvents.map((event, i) => (
							<BasicLink
								key={i}
								href={`/unlocks/${slug(event.protocol)}`}
								target="_blank"
								className="text-sm font-medium text-(--link-text)"
							>
								<div className="flex cursor-pointer items-center justify-between rounded-sm bg-(--bg-card) p-3 shadow-xs transition-colors duration-150 ease-in-out hover:bg-(--bg-muted)">
									<span className="flex items-center gap-3 text-sm font-medium text-(--text-primary)">
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

import * as React from 'react'
import dayjs from 'dayjs'
import { formattedNum, tokenIconUrl, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import type { DailyUnlocks } from '../types'
import type { Dayjs } from 'dayjs'

interface UnlocksListViewProps {
	events: Array<{ date: Dayjs; event: DailyUnlocks['events'][0] }>
}

export const UnlocksListView: React.FC<UnlocksListViewProps> = ({ events }) => {
	if (events.length === 0) {
		return <div className="text-center text-[var(--text2)] p-8 text-lg">No unlocks found for the next 30 days.</div>
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
		<div
			className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[70vh] border border-[var(--divider)] rounded bg-[var(--bg7)]
						[&::-webkit-scrollbar]:w-2
						[&::-webkit-scrollbar-track]:bg-transparent
						[&::-webkit-scrollbar-thumb]:bg-[var(--blue)]
						[&::-webkit-scrollbar-thumb]:rounded-full
						[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[var(--bg7)]
		"
		>
			{Object.entries(groupedEvents).map(([dateStr, dailyEvents], index) => (
				<div key={dateStr} className={`py-2 ${index > 0 ? 'border-t border-[var(--divider)]' : ''}`}>
					<h3 className="font-semibold text-base mb-3 sticky top-0 bg-[var(--bg6)] py-2 px-3 rounded-t-md z-10 border-b border-[var(--divider)] text-[var(--text1)]">
						{dayjs(dateStr).format('dddd, MMMM D, YYYY')}{' '}
						{dayjs(dateStr).isSame(dayjs(), 'day') && (
							<span className="text-xs font-normal text-[var(--blue)] ml-2">(Today)</span>
						)}
					</h3>
					<div className="flex flex-col gap-2 px-3">
						{dailyEvents.map((event, i) => (
							<BasicLink
								key={i}
								href={`/unlocks/${slug(event.protocol)}`}
								target="_blank"
								className="text-sm font-medium text-[var(--link-text)]"
							>
								<div className="flex justify-between items-center p-3 rounded bg-[var(--bg6)] hover:bg-[var(--bg5)] transition-colors duration-150 ease-in-out shadow-sm cursor-pointer">
									<span className="flex items-center gap-3 text-sm font-medium text-[var(--text1)]">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={20} />
										{event.protocol}
									</span>
									<span className="text-sm font-medium text-[var(--text2)]">{formattedNum(event.value, true)}</span>
								</div>
							</BasicLink>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

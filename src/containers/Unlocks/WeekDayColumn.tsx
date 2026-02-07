import dayjs from 'dayjs'
import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { DailyUnlocks, DayInfo } from './calendarTypes'

interface WeekDayColumnProps {
	dayInfo: DayInfo
	unlocksData: {
		[date: string]: DailyUnlocks
	}
}

export const WeekDayColumn: React.FC<WeekDayColumnProps> = ({ dayInfo, unlocksData }) => {
	const dateStr = dayInfo.date?.format('YYYY-MM-DD')
	const dayData = dateStr ? unlocksData[dateStr] : undefined
	const hasUnlocks = dayData && dayData.events && dayData.events.length > 0
	const isToday = dayInfo.date?.isSame(dayjs(), 'day')

	return (
		<div
			key={dateStr}
			className={`flex min-h-48 flex-col bg-(--cards-bg) p-3 ${isToday ? 'ring-1 ring-(--link-text) ring-inset' : ''}`}
		>
			<div className="mb-2 flex items-center justify-between border-b border-(--cards-border) pb-2 text-sm font-medium">
				<span>
					<span className="mr-1.5 text-(--text-secondary)">{dayInfo.date?.format('ddd')}</span>
					<span className={isToday ? 'font-bold text-(--link-text)' : ''}>{dayInfo.date?.date()}</span>
				</span>
				{isToday ? <span className="text-xs font-normal text-(--link-text)">(Today)</span> : null}
			</div>
			<div className="flex grow flex-col gap-1.5 overflow-y-auto">
				{hasUnlocks ? (
					dayData.events.map((event, i) => (
						<BasicLink key={i} href={`/unlocks/${slug(event.protocol)}`} target="_blank">
							<div className="rounded-md border border-(--cards-border) p-2 text-xs hover:bg-(--link-hover-bg)">
								<div className="mb-0.5 flex items-start justify-between gap-1">
									<div className="flex min-w-0 shrink items-center gap-1.5 font-medium">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
										<span className="truncate">{event.protocol}</span>
									</div>
									{event.unlockType ? (
										<span className="shrink-0 rounded-full border border-(--cards-border) bg-(--app-bg) px-1.5 py-0.5 text-[0.6rem] font-medium whitespace-nowrap text-(--text-secondary) sm:text-[0.65rem]">
											{event.unlockType}
										</span>
									) : null}
								</div>
								<div className="pl-[calc(16px+0.375rem)] text-(--text-secondary)">
									{formattedNum(event.value, true)}
								</div>
							</div>
						</BasicLink>
					))
				) : (
					<div className="flex grow items-center justify-center text-center text-xs text-(--text-secondary) opacity-75">
						No unlocks
					</div>
				)}
			</div>
		</div>
	)
}

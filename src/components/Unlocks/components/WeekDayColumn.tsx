import * as React from 'react'
import dayjs from 'dayjs'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { DailyUnlocks, DayInfo } from '../types'

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
			className={`flex min-h-48 flex-col border border-(--divider) bg-(--bg-glass) p-3 ${isToday ? 'border-(--blue)' : ''}`}
		>
			<div className="mb-2 flex items-center justify-between border-b border-(--divider) pb-2 text-sm font-medium">
				<span>
					<span className="mr-1.5 text-(--text-secondary)">{dayInfo.date?.format('ddd')}</span>
					<span className={isToday ? 'font-bold text-(--blue)' : 'text-(--text-primary)'}>{dayInfo.date?.date()}</span>
				</span>
				{isToday && <span className="text-xs font-normal text-(--blue)">(Today)</span>}
			</div>
			<div className="-mr-1 flex grow flex-col gap-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-(--blue)/50 [&::-webkit-scrollbar-track]:bg-transparent [&:hover::-webkit-scrollbar-thumb]:bg-(--blue)">
				{hasUnlocks && dayData ? (
					dayData.events.map((event, i) => (
						<BasicLink
							key={i}
							href={`/unlocks/${slug(event.protocol)}`}
							target="_blank"
							className="text-sm font-medium text-(--link-text)"
						>
							<div className="cursor-pointer rounded-md bg-(--bg-card) p-2 text-xs shadow-xs transition-colors duration-150 ease-in-out hover:bg-(--bg-muted)">
								<div className="mb-0.5 flex items-start justify-between gap-1">
									<div className="flex min-w-0 shrink items-center gap-1.5 font-medium text-(--text-primary)">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
										<span className="truncate">{event.protocol}</span>
									</div>
									{event.unlockType && (
										<span className="shrink-0 rounded-sm bg-(--bg-muted) px-1.5 py-0.5 text-[0.6rem] font-medium whitespace-nowrap text-white sm:text-[0.65rem]">
											{event.unlockType}
										</span>
									)}
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

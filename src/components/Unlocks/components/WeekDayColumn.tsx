import * as React from 'react'
import dayjs from 'dayjs'
import { formattedNum, tokenIconUrl, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
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
			className={`flex flex-col border border-[var(--divider)] bg-[var(--bg7)] p-3 min-h-[12rem] ${
				isToday ? 'border-[var(--blue)]' : ''
			}`}
		>
			<div className="text-sm font-medium mb-2 pb-2 border-b border-[var(--divider)] flex justify-between items-center">
				<span>
					<span className="text-[var(--text2)] mr-1.5">{dayInfo.date?.format('ddd')}</span>
					<span className={isToday ? 'text-[var(--blue)] font-bold' : 'text-[var(--text1)]'}>
						{dayInfo.date?.date()}
					</span>
				</span>
				{isToday && <span className="text-xs font-normal text-[var(--blue)]">(Today)</span>}
			</div>
			<div
				className="flex flex-col gap-1.5 overflow-y-auto flex-grow
				 [&::-webkit-scrollbar]:w-1.5
				 [&::-webkit-scrollbar-track]:bg-transparent
				 [&::-webkit-scrollbar-thumb]:bg-[var(--blue)]/[.5]
				 [&:hover::-webkit-scrollbar-thumb]:bg-[var(--blue)]
				 pr-1 -mr-1"
			>
				{hasUnlocks && dayData ? (
					dayData.events.map((event, i) => (
						<BasicLink
							key={i}
							href={`/unlocks/${slug(event.protocol)}`}
							target="_blank"
							className="text-sm font-medium text-[var(--link-text)]"
						>
							<div className="text-xs p-2 rounded-md bg-[var(--bg6)] hover:bg-[var(--bg5)] cursor-pointer transition-colors duration-150 ease-in-out shadow-sm">
								<div className="flex justify-between items-start gap-1 mb-0.5">
									<div className="font-medium text-[var(--text1)] flex items-center gap-1.5 min-w-0 flex-shrink">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
										<span className="truncate">{event.protocol}</span>
									</div>
									{event.unlockType && (
										<span className="px-1.5 py-0.5 rounded bg-[var(--bg5)] text-white text-[0.6rem] sm:text-[0.65rem] font-medium whitespace-nowrap flex-shrink-0">
											{event.unlockType}
										</span>
									)}
								</div>
								<div className="text-[var(--text2)] pl-[calc(16px+0.375rem)]">{formattedNum(event.value, true)}</div>
							</div>
						</BasicLink>
					))
				) : (
					<div className="flex-grow flex items-center justify-center text-center text-xs text-[var(--text2)] opacity-75">
						No unlocks
					</div>
				)}
			</div>
		</div>
	)
}

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
			className={`flex flex-col border border-(--divider) bg-(--bg7) p-3 min-h-48 ${
				isToday ? 'border-(--blue)' : ''
			}`}
		>
			<div className="text-sm font-medium mb-2 pb-2 border-b border-(--divider) flex justify-between items-center">
				<span>
					<span className="text-(--text2) mr-1.5">{dayInfo.date?.format('ddd')}</span>
					<span className={isToday ? 'text-(--blue) font-bold' : 'text-(--text1)'}>
						{dayInfo.date?.date()}
					</span>
				</span>
				{isToday && <span className="text-xs font-normal text-(--blue)">(Today)</span>}
			</div>
			<div
				className="flex flex-col gap-1.5 overflow-y-auto grow
				 [&::-webkit-scrollbar]:w-1.5
				 [&::-webkit-scrollbar-track]:bg-transparent
				 [&::-webkit-scrollbar-thumb]:bg-(--blue)/50
				 [&:hover::-webkit-scrollbar-thumb]:bg-(--blue)
				 pr-1 -mr-1"
			>
				{hasUnlocks && dayData ? (
					dayData.events.map((event, i) => (
						<BasicLink
							key={i}
							href={`/unlocks/${slug(event.protocol)}`}
							target="_blank"
							className="text-sm font-medium text-(--link-text)"
						>
							<div className="text-xs p-2 rounded-md bg-(--bg6) hover:bg-(--bg5) cursor-pointer transition-colors duration-150 ease-in-out shadow-xs">
								<div className="flex justify-between items-start gap-1 mb-0.5">
									<div className="font-medium text-(--text1) flex items-center gap-1.5 min-w-0 shrink">
										<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
										<span className="truncate">{event.protocol}</span>
									</div>
									{event.unlockType && (
										<span className="px-1.5 py-0.5 rounded-sm bg-(--bg5) text-white text-[0.6rem] sm:text-[0.65rem] font-medium whitespace-nowrap shrink-0">
											{event.unlockType}
										</span>
									)}
								</div>
								<div className="text-(--text2) pl-[calc(16px+0.375rem)]">{formattedNum(event.value, true)}</div>
							</div>
						</BasicLink>
					))
				) : (
					<div className="grow flex items-center justify-center text-center text-xs text-(--text2) opacity-75">
						No unlocks
					</div>
				)}
			</div>
		</div>
	)
}

import dayjs from 'dayjs'
import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import type { DailyUnlocks, DayInfo } from '../types'
import { interpolateColor } from '../utils/colorUtils'

interface CalendarDayCellProps {
	dayInfo: DayInfo
	unlocksData: {
		[date: string]: DailyUnlocks
	}
	maxUnlockValue: number
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({ dayInfo, unlocksData, maxUnlockValue }) => {
	const [isDarkMode] = useDarkModeManager()

	if (!dayInfo.date) return <div className="h-24 w-full border border-(--divider) bg-(--bg6) opacity-40"></div>

	const dateStr = dayInfo.date.format('YYYY-MM-DD')
	const dayData = unlocksData[dateStr]
	const hasUnlocks = dayData && dayData.totalValue > 0
	const isToday = dayInfo.date.isSame(dayjs(), 'day')

	let intensityFactor = 0
	if (hasUnlocks && maxUnlockValue > 0 && dayInfo.isCurrentMonth) {
		const normalizedValue = Math.min(1, dayData.totalValue / maxUnlockValue)
		intensityFactor = Math.log1p(normalizedValue * 9) / Math.log1p(10)
		intensityFactor = Math.min(1, Math.max(0, intensityFactor))
	}

	const baseColorRgb = [243, 244, 246]
	const darkModeBaseColorRgb = [30, 41, 59]
	const highlightColorRgb = [59, 130, 246]
	let interpolatedColorRgb = baseColorRgb
	if (dayInfo.isCurrentMonth && intensityFactor > 0) {
		const baseColor = isDarkMode ? darkModeBaseColorRgb : baseColorRgb
		interpolatedColorRgb = interpolateColor(baseColor, highlightColorRgb, intensityFactor)
	}

	const textColorClass = 'text-(--text1)'

	const textColorClassToday = 'text-(--blue)'

	const cellClasses = `h-24 w-full relative border transition-colors duration-150 ease-in-out ${
		isToday ? 'border-(--blue)' : 'border-(--divider)'
	} ${!dayInfo.isCurrentMonth ? 'bg-(--bg6) opacity-60 hover:opacity-80' : 'hover:brightness-110'}`

	const cellStyle: React.CSSProperties = {}
	if (dayInfo.isCurrentMonth && hasUnlocks) {
		cellStyle.backgroundColor = `rgb(${interpolatedColorRgb.join(', ')})`
	}

	const cellContent = (
		<div className={cellClasses} style={cellStyle}>
			<div className="h-full w-full p-2 flex flex-col justify-between relative z-10">
				<span className={`text-sm font-medium ${isToday ? `${textColorClassToday} font-bold` : textColorClass}`}>
					{dayInfo.date.date()}
				</span>
				{hasUnlocks && dayInfo.isCurrentMonth && (
					<>
						<div className={`text-xs mt-auto hidden sm:block truncate ${textColorClass}`}>
							Total: {formattedNum(dayData.totalValue, true)}
						</div>
					</>
				)}
			</div>
		</div>
	)

	if (!hasUnlocks) {
		return cellContent
	}

	return (
		<Tooltip
			content={
				<div className="flex flex-col gap-3 p-3 max-w-xs">
					<div className="font-semibold text-sm text-(--text1)">
						Total Unlock Value: {formattedNum(dayData.totalValue, true)}
					</div>
					{dayData.events.length > 0 && (
						<>
							<div className="border-t border-(--divider) -mx-3"></div>
							<div className="flex flex-col gap-2">
								{dayData.events.map((event, i) => (
									<div key={i} className="flex justify-between items-center gap-4 text-xs">
										<BasicLink
											href={`/unlocks/${slug(event.protocol)}`}
											target="_blank"
											className="text-sm font-medium text-(--link-text) flex items-center gap-1.5 hover:text-(--blue) shrink min-w-0 group"
										>
											<TokenLogo logo={tokenIconUrl(event.protocol)} size={16} />
											<span className="truncate group-hover:underline">{event.protocol}</span>
										</BasicLink>
										<span className="text-(--text2) font-medium whitespace-nowrap">
											{formattedNum(event.value, true)}
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			}
		>
			{cellContent}
		</Tooltip>
	)
}

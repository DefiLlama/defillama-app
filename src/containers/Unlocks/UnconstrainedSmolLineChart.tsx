import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import type { EmissionEvent } from './api.types'

const COLOR_MAP = {
	green: { dark: '#3fb84f', light: '#008a13' },
	red: { dark: '#e24a42', light: '#e60d02' }
} as const

function smoothPath(points: Array<[number, number]>): string {
	if (points.length < 2) return ''
	if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`

	let d = `M${points[0][0]},${points[0][1]}`
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(i - 1, 0)]
		const p1 = points[i]
		const p2 = points[i + 1]
		const p3 = points[Math.min(i + 2, points.length - 1)]

		const cp1x = p1[0] + (p2[0] - p0[0]) / 6
		const cp1y = p1[1] + (p2[1] - p0[1]) / 6
		const cp2x = p2[0] - (p3[0] - p1[0]) / 6
		const cp2y = p2[1] - (p3[1] - p1[1]) / 6

		d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
	}
	return d
}

interface ExtraData {
	lastEvent?: EmissionEvent[]
}

export function UnconstrainedSmolLineChart({
	series,
	color,
	className,
	extraData
}: {
	series: Array<[number, number]>
	name: string
	color: 'green' | 'red'
	className?: string
	extraData?: ExtraData
}) {
	const [isThemeDark] = useDarkModeManager()
	const containerRef = useRef<HTMLDivElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

	const unlockIndex = 7

	const onMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!containerRef.current || series.length === 0) return
			const rect = containerRef.current.getBoundingClientRect()
			const index = Math.min(Math.floor(((e.clientX - rect.left) / rect.width) * series.length), series.length - 1)
			if (index >= 0) {
				setHoveredIndex(index)
				setMousePos({ x: e.clientX, y: e.clientY })
			}
		},
		[series.length]
	)

	const onMouseLeave = useCallback(() => setHoveredIndex(null), [])

	useLayoutEffect(() => {
		const el = tooltipRef.current
		if (!el || hoveredIndex == null) return
		const flipX = mousePos.x + 12 + el.offsetWidth > window.innerWidth
		const flipY = mousePos.y - 12 + el.offsetHeight > window.innerHeight
		el.style.left = `${flipX ? mousePos.x - el.offsetWidth - 12 : mousePos.x + 12}px`
		el.style.top = `${flipY ? mousePos.y - el.offsetHeight + 12 : mousePos.y - 12}px`
	}, [mousePos, hoveredIndex])

	const { pathD, stroke, markLineX } = useMemo(() => {
		if (series.length === 0) return { pathD: '', stroke: '', markLineX: 0 }

		const values = series.map((s) => s[1])
		const min = Math.min(...values)
		const max = Math.max(...values)
		const range = max - min || 1

		const VB_W = 300
		const VB_H = 100
		const PAD = 2

		const pts: Array<[number, number]> = values.map((v, i) => {
			const x = series.length === 1 ? VB_W / 2 : (i / (series.length - 1)) * VB_W
			const y = PAD + ((max - v) / range) * (VB_H - PAD * 2)
			return [x, y]
		})

		const mlX =
			unlockIndex < series.length ? (series.length === 1 ? VB_W / 2 : (unlockIndex / (series.length - 1)) * VB_W) : 0

		const themeKey = isThemeDark ? 'dark' : 'light'
		return { pathD: smoothPath(pts), stroke: COLOR_MAP[color][themeKey], markLineX: mlX }
	}, [series, color, isThemeDark])

	if (series.length === 0 || series.length < 8) return null

	const unlockValue = series[unlockIndex]?.[1]
	const dayPosition = hoveredIndex != null ? hoveredIndex - unlockIndex : null
	const hoveredValue = hoveredIndex != null ? series[hoveredIndex]?.[1] : null
	const percentChange =
		dayPosition != null && dayPosition !== 0 && unlockValue && hoveredValue != null
			? ((hoveredValue - unlockValue) / unlockValue) * 100
			: null

	const lastEvent = extraData?.lastEvent

	return (
		<div className={className ?? 'my-auto h-[53px]'}>
			<div ref={containerRef} className="relative h-full" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 300 100"
					preserveAspectRatio="none"
					style={{ overflow: 'visible' }}
				>
					<path d={pathD} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
					{/* Unlock event mark line */}
					<line
						x1={markLineX}
						y1={0}
						x2={markLineX}
						y2={100}
						stroke={isThemeDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
						strokeWidth="1.5"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				{hoveredIndex != null ? (
					<div
						className="pointer-events-none absolute top-0 h-full border-l border-dashed border-[#ccc] dark:border-[#555]"
						style={{ left: `${series.length === 1 ? 50 : (hoveredIndex / (series.length - 1)) * 100}%` }}
					/>
				) : null}
				{hoveredIndex != null
					? createPortal(
							<div
								ref={tooltipRef}
								className="pointer-events-none fixed z-[1000] rounded border border-[#ccc] bg-white px-[10px] py-[5px] text-[12px] leading-[1.4] whitespace-nowrap text-[#666] shadow-md dark:border-[#555] dark:bg-[#1a1a1a] dark:text-[#d1d5db]"
							>
								<p>{formatTooltipChartDate(series[hoveredIndex][0], 'daily', true)}</p>
								<p className="flex items-center gap-1">
									<span className="inline-block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: stroke }} />
									Price: ${formattedNum(series[hoveredIndex][1])}
								</p>
								<div className="mt-1 opacity-80">
									{dayPosition === 0 ? (
										lastEvent && lastEvent.length > 0 ? (
											<UnlockEventTooltip lastEvent={lastEvent} unlockValue={unlockValue} stroke={stroke} />
										) : null
									) : (
										<span>
											Day {dayPosition != null && dayPosition > 0 ? '+' : ''}
											{dayPosition} from unlock
										</span>
									)}
								</div>
								{percentChange != null ? (
									<div
										style={{
											color:
												percentChange >= 0
													? COLOR_MAP.green[isThemeDark ? 'dark' : 'light']
													: COLOR_MAP.red[isThemeDark ? 'dark' : 'light']
										}}
										className="opacity-80"
									>
										{percentChange >= 0 ? '+' : ''}
										{percentChange.toFixed(1)}% from unlock
									</div>
								) : null}
							</div>,
							document.body
						)
					: null}
			</div>
		</div>
	)
}

function UnlockEventTooltip({
	lastEvent,
	unlockValue,
	stroke
}: {
	lastEvent: EmissionEvent[]
	unlockValue: number
	stroke: string
}) {
	const parseEventData = (event: EmissionEvent) => {
		const { description, noOfTokens, category } = event
		const regex =
			/(?:of (.+?) tokens (?:will be|were) unlocked)|(?:will (?:increase|decrease) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})|(?:from (.+?) on {timestamp})|(?:was (?:increased|decreased) from \{tokens\[0\]\} to \{tokens\[1\]\} tokens per week from (.+?) on {timestamp})/
		const matches = description?.match(regex)
		const name = matches?.[1] || matches?.[2] || matches?.[3] || matches?.[4] || ''
		const amount = noOfTokens?.reduce((a: number, b: number) => a + b, 0) || 0
		return { name, amount, category }
	}

	const eventDatas = lastEvent.map(parseEventData)
	const totalAmount = eventDatas.reduce((sum, event) => sum + event.amount, 0)
	const uniqueCategories = Array.from(new Set(eventDatas.flatMap((event) => (event.category ? [event.category] : []))))

	return (
		<div className="mt-1">
			<div className="flex items-center gap-1" style={{ color: stroke }}>
				Unlocked: {formattedNum(totalAmount * unlockValue, true)}
			</div>
			{uniqueCategories.length > 0 ? (
				<div className="text-[11px] text-[#666666]">
					Categories: {uniqueCategories.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')}
				</div>
			) : null}
		</div>
	)
}

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { CHART_COLORS, purple } from '~/constants/colors'
import { formattedNum } from '~/utils'

export function SmolBarChart({
	series,
	className,
	groupBy
}: {
	series: Array<[number, number]>
	className?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

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

	const { bars, hasNegative, posRatio } = useMemo(() => {
		if (series.length === 0) return { bars: [], hasNegative: false, posRatio: 1 }

		const values = series.map((s) => s[1])
		const maxPos = Math.max(0, ...values) || 1
		const maxNeg = Math.max(0, ...values.map((v) => -Math.min(0, v)))
		const neg = maxNeg > 0

		return {
			bars: values.map((v) => ({
				heightPct: v >= 0 ? (v / maxPos) * 100 : (Math.abs(v) / (maxNeg || 1)) * 100,
				isNegative: v < 0,
				fill: v >= 0 ? CHART_COLORS[0] : purple
			})),
			hasNegative: neg,
			posRatio: neg ? maxPos / (maxPos + maxNeg) : 1
		}
	}, [series])

	if (series.length === 0) return null

	const posHeight = `${posRatio * 100}%`
	const negHeight = `${(1 - posRatio) * 100}%`

	return (
		<div className={className ?? 'my-auto h-[132px]'}>
			<div ref={containerRef} className="relative h-full" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
				<div className="flex items-end" style={{ height: posHeight }}>
					{bars.map((bar, i) => (
						<div key={i} className="flex h-full flex-1 items-end justify-center">
							{!bar.isNegative && (
								<div
									className="min-h-px w-[70%] min-w-[2px]"
									style={{ height: `${bar.heightPct}%`, backgroundColor: bar.fill }}
								/>
							)}
						</div>
					))}
				</div>
				{hasNegative && (
					<div className="flex items-start" style={{ height: negHeight }}>
						{bars.map((bar, i) => (
							<div key={i} className="flex h-full flex-1 items-start justify-center">
								{bar.isNegative && (
									<div
										className="min-h-px w-[70%] min-w-[2px]"
										style={{ height: `${bar.heightPct}%`, backgroundColor: bar.fill }}
									/>
								)}
							</div>
						))}
					</div>
				)}
				{hoveredIndex != null && (
					<div
						className="pointer-events-none absolute top-0 h-full border-l border-dashed border-[#ccc] dark:border-[#555]"
						style={{ left: `${((hoveredIndex + 0.5) / series.length) * 100}%` }}
					/>
				)}
				{hoveredIndex != null && (
					<div
						ref={tooltipRef}
						className="pointer-events-none fixed z-10 rounded border border-[#ccc] bg-white px-[10px] py-[5px] text-[14px] leading-normal whitespace-nowrap text-[#666] shadow-md dark:border-[#555] dark:bg-[#1a1a1a] dark:text-[#d1d5db]"
					>
						<div>{formatTooltipChartDate(series[hoveredIndex][0], groupBy ?? 'daily')}</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							<span
								style={{
									display: 'inline-block',
									width: '10px',
									height: '10px',
									borderRadius: '50%',
									backgroundColor: series[hoveredIndex][1] >= 0 ? CHART_COLORS[0] : purple
								}}
							/>
							{formattedNum(series[hoveredIndex][1], true)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

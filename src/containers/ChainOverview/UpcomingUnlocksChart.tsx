import { useCallback, useMemo, useRef, useState } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { CHART_COLORS } from '~/constants/colors'
import { formattedNum } from '~/utils'

interface UnlockEntry {
	date: number
	total: number
	breakdown: Array<{ token: string; value: number; pct: string }>
}

export function UpcomingUnlocksChart({ data, className }: { data: Array<UnlockEntry>; className?: string }) {
	const containerRef = useRef<HTMLDivElement>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

	const onMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!containerRef.current || data.length === 0) return
			const rect = containerRef.current.getBoundingClientRect()
			const index = Math.min(Math.floor(((e.clientX - rect.left) / rect.width) * data.length), data.length - 1)
			if (index >= 0) {
				setHoveredIndex(index)
				setMousePos({ x: e.clientX, y: e.clientY })
			}
		},
		[data.length]
	)

	const onMouseLeave = useCallback(() => setHoveredIndex(null), [])

	const maxVal = useMemo(() => Math.max(...data.map((d) => d.total)) || 1, [data])

	if (data.length === 0) return null

	return (
		<div
			ref={containerRef}
			className={'relative ' + (className ?? 'my-auto h-[156px]')}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
		>
			<div className="flex h-full items-end">
				{data.map((d, i) => (
					<div key={i} className="flex h-full flex-1 items-end justify-center">
						<div
							className="w-[60%] min-w-[4px]"
							style={{
								height: `${(d.total / maxVal) * 100}%`,
								backgroundColor: hoveredIndex === i ? CHART_COLORS[1] : CHART_COLORS[0]
							}}
						/>
					</div>
				))}
			</div>
			{hoveredIndex != null && (
				<div
					className="pointer-events-none absolute top-0 h-full border-l border-dashed border-[#ccc] dark:border-[#555]"
					style={{ left: `${((hoveredIndex + 0.5) / data.length) * 100}%` }}
				/>
			)}
			{hoveredIndex != null && (
				<div
					ref={tooltipRef}
					className="pointer-events-none fixed z-10 rounded border border-[#ccc] bg-white px-[10px] py-[5px] text-[14px] leading-normal whitespace-nowrap text-[#666] shadow-md dark:border-[#555] dark:bg-[#1a1a1a] dark:text-[#d1d5db]"
					style={{
						top: mousePos.y - 12,
						left:
							tooltipRef.current && mousePos.x + 12 + tooltipRef.current.offsetWidth > window.innerWidth
								? mousePos.x - tooltipRef.current.offsetWidth - 12
								: mousePos.x + 12
					}}
				>
					<div>{formatTooltipChartDate(data[hoveredIndex].date, 'daily')}</div>
					<div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
						Total: ${formattedNum(data[hoveredIndex].total)}
					</div>
					{data[hoveredIndex].breakdown.map((item) => (
						<div key={item.token} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							{item.token}&nbsp;&nbsp;${formattedNum(item.value)} ({item.pct}%)
						</div>
					))}
				</div>
			)}
		</div>
	)
}

import { useCallback, useMemo, useRef, useState } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

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

export function SmolLineChart({
	series,
	color,
	className
}: {
	series: Array<[number, number]>
	name: string
	color: 'green' | 'red'
	className?: string
}) {
	const [isThemeDark] = useDarkModeManager()
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

	const { pathD, stroke } = useMemo(() => {
		if (series.length === 0) return { pathD: '', stroke: '' }

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

		const themeKey = isThemeDark ? 'dark' : 'light'
		return { pathD: smoothPath(pts), stroke: COLOR_MAP[color][themeKey] }
	}, [series, color, isThemeDark])

	if (series.length === 0) return null

	return (
		<div
			ref={containerRef}
			className={'relative ' + (className ?? 'my-auto h-[112px]')}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
		>
			<svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
				<path d={pathD} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
			</svg>
			{hoveredIndex != null && (
				<div
					className="pointer-events-none absolute top-0 h-full border-l border-dashed border-[#ccc] dark:border-[#555]"
					style={{ left: `${series.length === 1 ? 50 : (hoveredIndex / (series.length - 1)) * 100}%` }}
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
					<div>{formatTooltipChartDate(series[hoveredIndex][0], 'daily')}</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
						<span
							style={{
								display: 'inline-block',
								width: '10px',
								height: '10px',
								borderRadius: '50%',
								backgroundColor: stroke
							}}
						/>
						${formattedNum(series[hoveredIndex][1])}
					</div>
				</div>
			)}
		</div>
	)
}

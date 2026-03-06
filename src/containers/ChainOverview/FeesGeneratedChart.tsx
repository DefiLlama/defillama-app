import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { CHART_COLORS } from '~/constants/colors'
import { formattedNum, slug } from '~/utils'

export function FeesGeneratedChart({ series }: { series: Array<[string, number, string]> }) {
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

	if (series.length === 0) return null

	const maxVal = Math.max(...series.map((s) => s[1])) || 1

	return (
		<div className="flex-1 cursor-pointer">
			<div
				ref={containerRef}
				className="relative h-full"
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				onClick={() => {
					if (hoveredIndex != null) {
						window.open(`/fees/${slug(series[hoveredIndex][0])}`)
					}
				}}
			>
				<div className="flex h-[calc(100%-22px)] items-end">
					{series.map((s, i) => (
						<div key={i} className="flex h-full flex-1 items-end justify-center">
							<div
								className="w-[70%] min-w-[4px]"
								style={{
									height: `${(s[1] / maxVal) * 100}%`,
									backgroundColor: hoveredIndex === i ? CHART_COLORS[1] : CHART_COLORS[0]
								}}
							/>
						</div>
					))}
				</div>
				<div className="mt-1 flex h-[18px] items-center">
					{series.map((s, i) => (
						<div key={i} className="flex flex-1 items-center justify-center">
							<img src={s[2]} alt={s[0]} className="h-[18px] w-[18px] rounded-full" loading="lazy" decoding="async" />
						</div>
					))}
				</div>
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
						<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
							<img
								src={series[hoveredIndex][2]}
								style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0 }}
								alt=""
							/>
							{series[hoveredIndex][0]}
							&nbsp;&nbsp;${formattedNum(series[hoveredIndex][1])}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

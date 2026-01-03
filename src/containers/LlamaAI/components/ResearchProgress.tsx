import { memo, useEffect, useState } from 'react'
import { Icon } from '~/components/Icon'

interface ResearchProgressProps {
	isActive: boolean
	startTime: number
	currentIteration: number
	totalIterations: number
	phase: 'planning' | 'fetching' | 'analyzing' | 'synthesizing'
	dimensionsCovered: string[]
	dimensionsPending: string[]
	discoveries: string[]
	toolsExecuted: number
	progressMessage: string
}

const PHASES = ['planning', 'fetching', 'analyzing', 'synthesizing'] as const

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function AnimatedDots() {
	return (
		<span className="inline-flex w-4">
			<span className="animate-[dot1_1.5s_steps(1)_infinite]">.</span>
			<span className="animate-[dot2_1.5s_steps(1)_infinite]">.</span>
			<span className="animate-[dot3_1.5s_steps(1)_infinite]">.</span>
		</span>
	)
}

export const ResearchProgress = memo(function ResearchProgress({
	isActive,
	startTime,
	currentIteration,
	totalIterations,
	phase,
	dimensionsCovered,
	dimensionsPending,
	discoveries,
	toolsExecuted,
	progressMessage
}: ResearchProgressProps) {
	const [elapsed, setElapsed] = useState(0)
	const [isExpanded, setIsExpanded] = useState(false)

	useEffect(() => {
		if (!isActive) return
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startTime) / 1000))
		}, 1000)
		return () => clearInterval(interval)
	}, [isActive, startTime])

	if (!isActive) return null

	const phaseIndex = PHASES.indexOf(phase)
	const recentDiscoveries = discoveries.slice(-3)

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) p-2 sm:p-3 dark:border-[#222324]">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 text-left sm:gap-3"
			>
				<img src="/icons/llamaai_animation.webp" alt="" className="h-6 w-6 shrink-0" />

				<div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
					<span className="truncate text-xs text-[#666] sm:text-sm dark:text-[#919296]">{progressMessage}</span>
					<span className="flex items-center gap-2 text-[10px] text-[#999] sm:hidden dark:text-[#666]">
						<span className="capitalize">{phase}</span>
						<AnimatedDots />
						{discoveries.length > 0 && <span>• {discoveries.length} findings</span>}
					</span>
				</div>

				<span className="hidden shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] text-[#666] sm:flex sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					<span className="capitalize">{phase}</span>
					<AnimatedDots />
				</span>

				<span className="shrink-0 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 text-[10px] font-medium text-[#666] sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					{currentIteration}/{totalIterations}
				</span>

				<span className="flex shrink-0 items-center gap-1 rounded bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[10px] text-[#666] tabular-nums sm:text-xs dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]">
					<Icon name="clock" height={10} width={10} />
					{formatTime(elapsed)}
				</span>

				<Icon
					name={isExpanded ? 'chevron-up' : 'chevron-down'}
					height={14}
					width={14}
					className="hidden shrink-0 text-[#666] sm:block dark:text-[#919296]"
				/>
			</button>

			{isExpanded && (
				<div className="hidden flex-col gap-2 border-t border-[#e6e6e6] pt-2 sm:flex dark:border-[#222324]">
					<div className="flex items-center gap-1">
						{PHASES.map((p, i) => (
							<div key={p} className="flex items-center">
								<div
									className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
										i < phaseIndex
											? 'bg-(--old-blue) text-white'
											: i === phaseIndex
												? 'animate-pulse bg-(--old-blue)/20 text-(--old-blue) ring-2 ring-(--old-blue)'
												: 'bg-[rgba(0,0,0,0.04)] text-[#666] dark:bg-[rgba(145,146,150,0.12)] dark:text-[#919296]'
									}`}
								>
									{i < phaseIndex ? (
										<Icon name="check" height={10} width={10} />
									) : i === phaseIndex ? (
										<span className="h-2 w-2 animate-pulse rounded-full bg-(--old-blue)" />
									) : (
										<span className="text-[8px] font-bold">{i + 1}</span>
									)}
								</div>
								{i < PHASES.length - 1 && (
									<div
										className={`h-0.5 w-3 transition-colors ${
											i < phaseIndex ? 'bg-(--old-blue)' : 'bg-[#e6e6e6] dark:bg-[#222324]'
										}`}
									/>
								)}
							</div>
						))}
						<span className="ml-2 flex items-center text-xs text-[#666] capitalize dark:text-[#919296]">
							{phase}
							<AnimatedDots />
						</span>
					</div>

					{(dimensionsCovered.length > 0 || dimensionsPending.length > 0) && (
						<div className="flex flex-wrap items-center gap-1.5 text-xs">
							{dimensionsCovered.map((dim) => (
								<span
									key={dim}
									className="flex items-center gap-1 rounded-full bg-(--old-blue)/10 px-2 py-0.5 text-(--old-blue)"
								>
									{dim}
									<Icon name="check" height={8} width={8} />
								</span>
							))}
							{dimensionsPending.slice(0, 2).map((dim) => (
								<span
									key={dim}
									className="flex items-center gap-1 rounded-full border border-dashed border-[#e6e6e6] px-2 py-0.5 text-[#666] dark:border-[#222324] dark:text-[#919296]"
								>
									{dim}
								</span>
							))}
							{dimensionsPending.length > 2 && (
								<span className="text-[#666] dark:text-[#919296]">+{dimensionsPending.length - 2}</span>
							)}
						</div>
					)}

					{recentDiscoveries.length > 0 && (
						<div className="flex flex-col gap-1">
							<span className="flex items-center gap-1 text-xs text-[#666] dark:text-[#919296]">
								<Icon name="sparkles" height={10} width={10} />
								Recent discoveries ({discoveries.length} total)
							</span>
							<ul className="flex max-h-24 flex-col gap-0.5 overflow-y-auto pl-3">
								{recentDiscoveries.map((discovery, i) => (
									<li key={i} className="text-xs text-[#666] before:mr-1.5 before:content-['-'] dark:text-[#919296]">
										{discovery}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	)
})

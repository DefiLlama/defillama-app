import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { AgenticAnswerMode, FactCheckedUsage, ResearchUsage } from '~/containers/LlamaAI/types'
import { useAuthContext } from '~/containers/Subscription/auth'

interface ModeToggleProps {
	mode: AgenticAnswerMode
	setMode: (mode: AgenticAnswerMode) => void
	researchUsage?: ResearchUsage | null
	factCheckedUsage?: FactCheckedUsage | null
	onFactCheckedGated?: () => void
}

export function ModeToggle({ mode, setMode, researchUsage, factCheckedUsage, onFactCheckedGated }: ModeToggleProps) {
	const { user } = useAuthContext()
	const needsVerification = !!user && !user.verified
	const factCheckedBlocked = factCheckedUsage?.period === 'blocked'

	const handleFactCheckedClick = () => {
		if (factCheckedBlocked) {
			onFactCheckedGated?.()
			return
		}
		setMode('fact_checked')
	}

	return (
		<div
			data-walkthrough="mode-toggle"
			className="flex items-center rounded-lg border border-[#EEE] bg-white p-0.5 dark:border-[#232628] dark:bg-[#131516]"
		>
			<Tooltip
				content={
					<div className="flex max-w-[200px] flex-col gap-1">
						<span className="font-medium text-[#1a1a1a] dark:text-white">Quick Mode</span>
						<span className="text-[#666] dark:text-[#999]">Fast responses for most queries</span>
					</div>
				}
				render={
					<button
						type="button"
						onClick={() => setMode('quick')}
						data-umami-event="llamaai-quick-mode-toggle"
						data-active={mode === 'quick'}
					/>
				}
				className="flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#878787] data-[active=true]:bg-(--old-blue)/10 data-[active=true]:text-[#1853A8] dark:text-[#878787] dark:data-[active=true]:bg-(--old-blue)/15 dark:data-[active=true]:text-[#4B86DB]"
			>
				<Icon name="sparkles" height={12} width={12} />
				<span>Quick</span>
			</Tooltip>
			<Tooltip
				content={
					<div className="flex max-w-[220px] flex-col gap-1.5">
						<span className="font-medium text-[#1a1a1a] dark:text-white">Fact-checked</span>
						<span className="text-[#666] dark:text-[#999]">Two-pass verification with cited evidence</span>
						<span className="border-t border-[#eee] pt-1.5 text-[11px] text-[#555] dark:border-[#333] dark:text-[#aaa]">
							{factCheckedUsage?.period === 'unlimited'
								? 'Unlimited answers'
								: factCheckedBlocked
									? 'Subscribe to use fact-checked'
									: factCheckedUsage
										? `${factCheckedUsage.remainingUsage}/${factCheckedUsage.limit} remaining${factCheckedUsage.period === 'daily' ? ' today' : ''}`
										: '10 answers/day on Pro · 10 lifetime on trial'}
						</span>
					</div>
				}
				render={
					<button
						type="button"
						onClick={handleFactCheckedClick}
						data-umami-event="llamaai-fact-checked-mode-toggle"
						data-active={mode === 'fact_checked'}
					/>
				}
				className="flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#878787] data-[active=true]:bg-(--old-blue)/10 data-[active=true]:text-[#1853A8] dark:text-[#878787] dark:data-[active=true]:bg-(--old-blue)/15 dark:data-[active=true]:text-[#4B86DB]"
			>
				<Icon name="check" height={12} width={12} />
				<span>Fact-checked</span>
				{factCheckedUsage && factCheckedUsage.limit > 0 && factCheckedUsage.period !== 'unlimited' ? (
					<span className="text-[10px] opacity-70">
						{factCheckedUsage.remainingUsage}/{factCheckedUsage.limit}
					</span>
				) : null}
			</Tooltip>
			<Tooltip
				content={
					<div className="flex max-w-[220px] flex-col gap-1.5">
						<span className="font-medium text-[#1a1a1a] dark:text-white">Research Mode</span>
						<span className="text-[#666] dark:text-[#999]">
							Comprehensive reports with in-depth analysis and citations
						</span>
						<span className="border-t border-[#eee] pt-1.5 text-[11px] text-[#555] dark:border-[#333] dark:text-[#aaa]">
							{researchUsage?.period === 'unlimited'
								? 'Unlimited reports'
								: researchUsage?.period === 'blocked'
									? needsVerification
										? 'Verify your email to use research'
										: 'Subscribe to Pro to use research'
									: researchUsage
										? `${researchUsage.remainingUsage}/${researchUsage.limit} remaining${researchUsage.period === 'daily' ? ' today' : researchUsage.period === 'biweekly' ? ' (every 14 days)' : ''}`
										: '5 reports/day · Free trial: 3 total'}
						</span>
					</div>
				}
				render={
					<button
						type="button"
						onClick={() => setMode('research')}
						data-umami-event="llamaai-research-mode-toggle"
						data-active={mode === 'research'}
					/>
				}
				className="flex min-h-6 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#878787] data-[active=true]:bg-(--old-blue)/10 data-[active=true]:text-[#1853A8] dark:text-[#878787] dark:data-[active=true]:bg-(--old-blue)/15 dark:data-[active=true]:text-[#4B86DB]"
			>
				<Icon name="search" height={12} width={12} />
				<span>Research</span>
				{researchUsage && researchUsage.limit > 0 && researchUsage.period !== 'unlimited' ? (
					<span className="text-[10px] opacity-70">
						{researchUsage.remainingUsage}/{researchUsage.limit}
					</span>
				) : null}
			</Tooltip>
		</div>
	)
}

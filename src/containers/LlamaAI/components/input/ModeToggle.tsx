import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import type { ResearchUsage } from '~/containers/LlamaAI/types'

interface ModeToggleProps {
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
}

export function ModeToggle({ isResearchMode, setIsResearchMode, researchUsage }: ModeToggleProps) {
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
						onClick={() => setIsResearchMode(false)}
						data-umami-event="llamaai-quick-mode-toggle"
						data-active={!isResearchMode}
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
						<span className="font-medium text-[#1a1a1a] dark:text-white">Research Mode</span>
						<span className="text-[#666] dark:text-[#999]">
							Comprehensive reports with in-depth analysis and citations
						</span>
						<span className="border-t border-[#eee] pt-1.5 text-[11px] text-[#555] dark:border-[#333] dark:text-[#aaa]">
							{researchUsage?.period === 'unlimited'
								? 'Unlimited reports'
								: researchUsage?.period === 'blocked'
									? 'Subscribe to Pro to use research'
									: researchUsage
										? `${researchUsage.remainingUsage}/${researchUsage.limit} remaining${researchUsage.period === 'daily' ? ' today' : researchUsage.period === 'biweekly' ? ' (every 14 days)' : ''}`
										: '5 reports/day · Free trial: 3 total'}
						</span>
					</div>
				}
				render={
					<button
						type="button"
						onClick={() => setIsResearchMode(true)}
						data-umami-event="llamaai-research-mode-toggle"
						data-active={isResearchMode}
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

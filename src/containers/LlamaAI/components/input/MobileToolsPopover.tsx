import * as Ariakit from '@ariakit/react'
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '~/components/Icon'
import { NestedMenu } from '~/components/NestedMenu'
import { BrowserContent } from '~/containers/LlamaAI/components/input/CapabilityBrowser'
import type { ResearchUsage } from '~/containers/LlamaAI/types'

interface MobileToolsPopoverProps {
	isResearchMode: boolean
	setIsResearchMode: Dispatch<SetStateAction<boolean>>
	researchUsage?: ResearchUsage | null
	onOpenAlerts?: () => void
	onPromptSelect: (prompt: string, categoryKey?: string) => void
	onImageUploadClick: () => void
	isPending: boolean
	isStreaming?: boolean
}

const itemClassName =
	'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13.5px] text-[#333] transition-colors hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5] data-active-item:bg-[#f5f5f5] dark:text-[#ccc] dark:hover:bg-white/5 dark:focus-visible:bg-white/5 dark:data-active-item:bg-white/5'

export function MobileToolsPopover({
	isResearchMode,
	setIsResearchMode,
	researchUsage,
	onOpenAlerts,
	onPromptSelect,
	onImageUploadClick,
	isPending,
	isStreaming
}: MobileToolsPopoverProps) {
	const disabled = isPending || !!isStreaming
	const menu = Ariakit.useMenuStore({ placement: 'top-start' })

	const handlePromptSelect = (prompt: string, categoryKey?: string) => {
		menu.hideAll()
		onPromptSelect(prompt, categoryKey)
	}

	const handleOpenAlerts = () => {
		menu.hideAll()
		onOpenAlerts?.()
	}

	const handleImageUpload = () => {
		menu.hideAll()
		onImageUploadClick()
	}

	return (
		<Ariakit.MenuProvider store={menu}>
			<Ariakit.MenuButton
				disabled={disabled}
				aria-label="Open mobile tools"
				className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555] transition-colors hover:bg-[#e4e4e4] hover:text-[#333] disabled:pointer-events-none disabled:opacity-40 aria-expanded:bg-[#2563eb]/15 aria-expanded:text-[#2563eb] sm:hidden dark:bg-white/8 dark:text-[#a1a1aa] dark:hover:bg-white/12 dark:hover:text-[#e4e4e7] dark:aria-expanded:bg-[#60a5fa]/15 dark:aria-expanded:text-[#60a5fa]"
			>
				<Icon name="plus" height={16} width={16} />
			</Ariakit.MenuButton>

			<Ariakit.Menu
				portal
				modal
				unmountOnHide
				gutter={8}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="z-10 flex flex-col gap-0.5 rounded-xl border border-black/8 bg-white p-1.5 shadow-2xl max-sm:h-[calc(100dvh-80px)] max-sm:drawer max-sm:overflow-auto max-sm:rounded-b-none sm:max-h-[60dvh] dark:border-[#2a2a2e] dark:bg-[#18181b]"
			>
				<div className="flex items-center justify-between px-3 pt-3 pb-1 sm:hidden">
					{/* <Ariakit.MenuHeading className="text-[13px] font-semibold text-[#111] dark:text-[#f0f0f0]">
						Tools
					</Ariakit.MenuHeading> */}
					<Ariakit.MenuDismiss
						aria-label="Close mobile tools"
						className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f0f0] text-[#555] transition-colors hover:bg-[#e0e0e0] dark:bg-white/10 dark:text-[#aaa] dark:hover:bg-white/15"
					>
						<Icon name="x" height={14} width={14} />
					</Ariakit.MenuDismiss>
				</div>

				<Ariakit.MenuItem className={itemClassName} hideOnClick={false} onClick={handleImageUpload}>
					<Icon name="image-plus" height={16} width={16} className="shrink-0 text-[#777] dark:text-[#888]" />
					<span>Add photo</span>
				</Ariakit.MenuItem>

				<Ariakit.MenuSeparator className="mx-2 border-t border-black/6 dark:border-white/6" />

				<Ariakit.MenuItem
					className={itemClassName}
					hideOnClick={false}
					onClick={() => setIsResearchMode(false)}
					data-umami-event="llamaai-quick-mode-toggle"
				>
					<Icon name="sparkles" height={16} width={16} className="shrink-0 text-[#777] dark:text-[#888]" />
					<span className="flex-1">Quick</span>
					{!isResearchMode ? (
						<Icon name="check" height={14} width={14} className="shrink-0 text-[#2563eb] dark:text-[#60a5fa]" />
					) : null}
				</Ariakit.MenuItem>

				<Ariakit.MenuItem
					className={itemClassName}
					hideOnClick={false}
					onClick={() => setIsResearchMode(true)}
					data-umami-event="llamaai-research-mode-toggle"
				>
					<Icon name="search" height={16} width={16} className="shrink-0 text-[#777] dark:text-[#888]" />
					<span className="flex-1">Research</span>
					<span className="flex items-center gap-1.5">
						{researchUsage && researchUsage.limit > 0 && researchUsage.period !== 'unlimited' ? (
							<span className="text-[11px] text-[#999] dark:text-[#666]">
								{researchUsage.remainingUsage}/{researchUsage.limit}
							</span>
						) : null}
						{isResearchMode ? (
							<Icon name="check" height={14} width={14} className="shrink-0 text-[#2563eb] dark:text-[#60a5fa]" />
						) : null}
					</span>
				</Ariakit.MenuItem>

				<Ariakit.MenuSeparator className="mx-2 border-t border-black/6 dark:border-white/6" />

				<NestedMenu
					label={
						<span className="flex items-center gap-3">
							<Icon name="layout-grid" height={16} width={16} className="shrink-0 text-[#777] dark:text-[#888]" />
							<span>Explore</span>
						</span>
					}
					className={itemClassName}
				>
					<BrowserContent onPromptSelect={handlePromptSelect} hideDragHandle />
				</NestedMenu>

				{onOpenAlerts ? (
					<Ariakit.MenuItem className={itemClassName} hideOnClick={false} onClick={handleOpenAlerts}>
						<Icon name="calendar-plus" height={16} width={16} className="shrink-0 text-amber-500 dark:text-amber-400" />
						<span>Manage Alerts</span>
					</Ariakit.MenuItem>
				) : null}
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

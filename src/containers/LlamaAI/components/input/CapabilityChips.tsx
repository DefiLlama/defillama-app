import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { CapabilityBrowser } from '~/containers/LlamaAI/components/input/CapabilityBrowser'
import { trackUmamiEvent } from '~/utils/analytics/umami'

interface CapabilityChipsProps {
	onPromptSelect: (prompt: string, categoryKey?: string) => void
	isPending: boolean
	isStreaming?: boolean
}

export function CapabilityChips({ onPromptSelect, isPending, isStreaming }: CapabilityChipsProps) {
	const disabled = isPending || !!isStreaming

	return (
		<Ariakit.PopoverProvider
			placement="bottom-start"
			setOpen={(open) => {
				if (open) trackUmamiEvent('llamaai-capability-chip-click', { category: 'explore' })
			}}
		>
			<Ariakit.PopoverDisclosure
				data-walkthrough="explore-button"
				disabled={disabled}
				className="group flex h-7 items-center justify-center gap-1 rounded-md bg-[#2563eb]/8 px-2 text-[#2563eb]/70 transition-colors duration-150 hover:bg-[#2563eb]/15 hover:text-[#2563eb] disabled:pointer-events-none disabled:opacity-40 aria-expanded:bg-[#2563eb]/15 aria-expanded:text-[#2563eb] dark:bg-[#60a5fa]/8 dark:text-[#60a5fa]/70 dark:hover:bg-[#60a5fa]/15 dark:hover:text-[#60a5fa] dark:aria-expanded:bg-[#60a5fa]/15 dark:aria-expanded:text-[#60a5fa]"
			>
				<Icon name="layout-grid" height={14} width={14} className="group-aria-expanded:hidden" />
				<Icon name="x" height={14} width={14} className="hidden group-aria-expanded:block" />
				<span className="text-xs font-medium">Explore</span>
			</Ariakit.PopoverDisclosure>
			<CapabilityBrowser onPromptSelect={onPromptSelect} />
		</Ariakit.PopoverProvider>
	)
}

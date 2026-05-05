import Router from 'next/router'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { useTipActions } from '~/containers/LlamaAI/components/TipActionContext'
import { useActiveTip } from '~/containers/LlamaAI/hooks/useLlamaAITip'

export function LlamaAITipBanner() {
	const { tip, dismissTip, clickTip } = useActiveTip()
	const actions = useTipActions()
	if (!tip) return null

	const onPrimary = () => {
		if (tip.cta.kind === 'none') return
		if (tip.cta.kind === 'link') {
			void clickTip(tip, 'link')
			if (tip.cta.external) window.open(tip.cta.href, '_blank', 'noopener,noreferrer')
			else void Router.push(tip.cta.href)
			return
		}
		void clickTip(tip, tip.cta.action)
		runAction(tip.cta.action, actions)
	}

	return (
		<div className="flex items-center gap-3 rounded-lg border border-[#e6e6e6] bg-(--cards-bg) px-3.5 py-2.5 dark:border-[#222324]">
			<Tooltip content={tip.title} className="min-w-0 flex-1" data-fullwidth>
				<p className="m-0 truncate text-[13px] text-[#444] dark:text-[#ddd]" title={tip.title}>
					{tip.title}
				</p>
			</Tooltip>
			{tip.cta.kind !== 'none' && (
				<button
					type="button"
					onClick={onPrimary}
					className="shrink-0 rounded-md bg-black px-3 py-1 text-[12px] font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
				>
					{tip.cta.label}
				</button>
			)}
			<button
				type="button"
				onClick={() => void dismissTip(tip)}
				aria-label="Dismiss tip"
				className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#999] transition-colors hover:bg-black/5 hover:text-[#333] dark:text-[#666] dark:hover:bg-white/5 dark:hover:text-white"
			>
				<Icon name="x" height={14} width={14} />
			</button>
		</div>
	)
}

function runAction(action: string, actions: ReturnType<typeof useTipActions>) {
	switch (action) {
		case 'open-settings':
			actions.openSettingsModal?.()
			break
		case 'open-alerts':
			actions.openAlertsModal?.()
			break
		case 'open-research-mode':
			actions.toggleResearchMode?.()
			break
		default:
			console.warn('Unknown tip action', action)
	}
}

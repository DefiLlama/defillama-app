import { LlamaAITipBanner } from '~/containers/LlamaAI/components/LlamaAITipBanner'
import { NotificationPermissionBanner } from '~/containers/LlamaAI/components/NotificationPermissionBanner'
import { useActiveTip } from '~/containers/LlamaAI/hooks/useLlamaAITip'

export function TipOrNotifyBanner() {
	const { tip } = useActiveTip()
	return tip ? <LlamaAITipBanner /> : <NotificationPermissionBanner />
}

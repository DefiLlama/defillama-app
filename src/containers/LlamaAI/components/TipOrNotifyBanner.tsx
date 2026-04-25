import { LlamaAITipBanner } from '~/containers/LlamaAI/components/LlamaAITipBanner'
import { NotificationPermissionBanner } from '~/containers/LlamaAI/components/NotificationPermissionBanner'
import { useLlamaAISettings } from '~/containers/LlamaAI/hooks/useLlamaAISettings'

export function TipOrNotifyBanner() {
	const { tip } = useLlamaAISettings()
	return tip ? <LlamaAITipBanner /> : <NotificationPermissionBanner />
}

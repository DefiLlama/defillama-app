import { useLlamaAISetting } from '~/containers/LlamaAI/hooks/useLlamaAISettings'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export function useHackerMode(): boolean {
	const [isDark] = useDarkModeManager()
	const enabled = useLlamaAISetting('hackerMode')
	return enabled && isDark
}

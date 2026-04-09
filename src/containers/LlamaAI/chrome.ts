import { createContext, useContext } from 'react'

type LlamaAIChrome = {
	toggleSidebar: () => void
	hideSidebar: () => void
	toggleFullscreen: () => void
	isFullscreen: boolean
	sidebarVisible: boolean
	toggleDashboardPanel: () => void
	isDashboardPanelOpen: boolean
}

export const LlamaAIChromeContext = createContext<LlamaAIChrome | null>(null)

export function useLlamaAIChrome() {
	const value = useContext(LlamaAIChromeContext)

	if (value === null) {
		throw new Error('LlamaAIChromeContext is missing')
	}

	return value
}

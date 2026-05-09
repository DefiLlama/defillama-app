import { createContext, useContext, type ReactNode } from 'react'

export type TipActionHandlers = {
	openSettingsModal?: () => void
	openAlertsModal?: () => void
	toggleResearchMode?: () => void
	submitPrompt?: (prompt: string) => void
}

const TipActionContext = createContext<TipActionHandlers>({})

export function TipActionProvider({ handlers, children }: { handlers: TipActionHandlers; children: ReactNode }) {
	return <TipActionContext.Provider value={handlers}>{children}</TipActionContext.Provider>
}

export function useTipActions() {
	return useContext(TipActionContext)
}

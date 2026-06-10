import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { UnifiedCitationReference } from '~/containers/LlamaAI/types'

export interface CitationSheetValue {
	activeRef: UnifiedCitationReference | null
	isOpen: boolean
	open: (reference: UnifiedCitationReference) => void
	close: () => void
}

const CitationSheetContext = createContext<CitationSheetValue | null>(null)

export function useCitationSheetController(): CitationSheetValue {
	const [activeRef, setActiveRef] = useState<UnifiedCitationReference | null>(null)
	const open = useCallback((reference: UnifiedCitationReference) => setActiveRef(reference), [])
	const close = useCallback(() => setActiveRef(null), [])
	return useMemo(() => ({ activeRef, isOpen: activeRef !== null, open, close }), [activeRef, open, close])
}

export function CitationSheetProvider({ value, children }: { value: CitationSheetValue; children: ReactNode }) {
	return <CitationSheetContext.Provider value={value}>{children}</CitationSheetContext.Provider>
}

export function useCitationSheet(): CitationSheetValue {
	const ctx = useContext(CitationSheetContext)
	return ctx ?? { activeRef: null, isOpen: false, open: () => {}, close: () => {} }
}

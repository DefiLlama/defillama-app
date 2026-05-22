import React, { createContext, useContext, useState } from 'react'

interface SharedHeightContextType {
	height: number | undefined
	setHeight: (height: number) => void
}

const SharedHeightContext = createContext<SharedHeightContextType | undefined>(undefined)

export function useSharedHeight() {
	const context = useContext(SharedHeightContext)
	if (context === undefined) {
		throw new Error('useSharedHeight must be used within a ResearchSectionWithSharedHeightProvider')
	}
	return context
}

interface ResearchSectionWithSharedHeightProviderProps {
	children: React.ReactNode
}

export function ResearchSectionWithSharedHeightProvider({ children }: ResearchSectionWithSharedHeightProviderProps) {
	const [height, setHeight] = useState<number | undefined>(undefined)

	return <SharedHeightContext.Provider value={{ height, setHeight }}>{children}</SharedHeightContext.Provider>
}

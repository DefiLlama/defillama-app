import { useCallback, useContext, createContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'


export type CSVExtractorFunction = (returnContent: boolean) => string | void


interface CSVRegistry {
	[tableId: string]: CSVExtractorFunction
}


interface CSVRegistryContextType {
	registry: CSVRegistry
	registerCSVExtractor: (tableId: string, extractor: CSVExtractorFunction) => void
	unregisterCSVExtractor: (tableId: string) => void
	getCSVExtractor: (tableId: string) => CSVExtractorFunction | undefined
}

const CSVRegistryContext = createContext<CSVRegistryContextType>({
	registry: {},
	registerCSVExtractor: () => {},
	unregisterCSVExtractor: () => {},
	getCSVExtractor: () => undefined
})


export function CSVRegistryProvider({ children }: { children: ReactNode }) {
	const [registry, setRegistry] = useState<CSVRegistry>({})

	const registerCSVExtractor = useCallback((tableId: string, extractor: CSVExtractorFunction) => {
		setRegistry(prev => ({
			...prev,
			[tableId]: extractor
		}))
	}, [])

	const unregisterCSVExtractor = useCallback((tableId: string) => {
		setRegistry(prev => {
			const newRegistry = { ...prev }
			delete newRegistry[tableId]
			return newRegistry
		})
	}, [])

	const getCSVExtractor = useCallback((tableId: string) => {
		const extractor = registry[tableId]
		if (extractor) {
			
		} else {
			
		}
		return extractor
	}, [registry])

	const value = {
		registry,
		registerCSVExtractor,
		unregisterCSVExtractor,
		getCSVExtractor
	}

	return (
		<CSVRegistryContext.Provider value={value}>
			{children}
		</CSVRegistryContext.Provider>
	)
}


export function useCSVRegistry() {
	const context = useContext(CSVRegistryContext)
	if (!context) {
		throw new Error('useCSVRegistry must be used within a CSVRegistryProvider')
	}
	return context
}


export function useRegisterCSVExtractor(tableId: string, extractor: CSVExtractorFunction | undefined) {
	const { registerCSVExtractor, unregisterCSVExtractor } = useCSVRegistry()

	useEffect(() => {
		if (extractor && tableId) {
			registerCSVExtractor(tableId, extractor)
			return () => {
				unregisterCSVExtractor(tableId)
			}
		}
		
	}, [tableId, extractor]) 
}
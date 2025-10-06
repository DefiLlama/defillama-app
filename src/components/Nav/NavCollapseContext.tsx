import * as React from 'react'

interface NavCollapseContextType {
	collapseAll: () => void
	registerDisclosure: (id: string, disclosure: any) => void
	unregisterDisclosure: (id: string) => void
}

const NavCollapseContext = React.createContext<NavCollapseContextType | null>(null)

export function NavCollapseProvider({ children }: { children: React.ReactNode }) {
	const disclosuresRef = React.useRef<Map<string, any>>(new Map())

	const registerDisclosure = React.useCallback((id: string, disclosure: any) => {
		disclosuresRef.current.set(id, disclosure)
	}, [])

	const unregisterDisclosure = React.useCallback((id: string) => {
		disclosuresRef.current.delete(id)
	}, [])

	const collapseAll = React.useCallback(() => {
		disclosuresRef.current.forEach((disclosure) => {
			disclosure.setOpen(false)
		})
	}, [])

	return (
		<NavCollapseContext.Provider value={{ collapseAll, registerDisclosure, unregisterDisclosure }}>
			{children}
		</NavCollapseContext.Provider>
	)
}

export function useNavCollapse() {
	const context = React.useContext(NavCollapseContext)
	return context
}

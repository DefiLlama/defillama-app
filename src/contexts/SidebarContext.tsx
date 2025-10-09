import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'

interface SidebarContextType {
	isCollapsed: boolean
	isInitialized: boolean
	isPinned: boolean
	toggle: () => void
	setCollapsed: (collapsed: boolean) => void
	setPinned: (pinned: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

const STORAGE_KEY = 'defillama-sidebar-collapsed'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)
	const [isPinned, setIsPinned] = useState(false)

	// Initialize state from localStorage
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY)
		console.log('Initializing sidebar state from localStorage:', stored)
		if (stored !== null) {
			const parsedValue = JSON.parse(stored)
			console.log('Setting initial collapsed state to:', parsedValue)
			setIsCollapsed(parsedValue)
		}
		setIsInitialized(true)
	}, [])

	// Persist state to localStorage
	useEffect(() => {
		console.log('Persisting sidebar state to localStorage:', isCollapsed)
		localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
	}, [isCollapsed])

	// Toggle function
	const toggle = useCallback(() => {
		setIsCollapsed((prev) => {
			console.log('Toggling sidebar from', prev, 'to', !prev)
			const newState = !prev
			// When expanding via toggle (button or keyboard), pin it
			// When collapsing, unpin it
			setIsPinned(!newState)
			return newState
		})
	}, [])

	// Set specific state
	const setCollapsed = useCallback((collapsed: boolean) => {
		setIsCollapsed(collapsed)
	}, [])

	// Set pinned state
	const setPinned = useCallback((pinned: boolean) => {
		setIsPinned(pinned)
	}, [])

	// Keyboard shortcut support (Cmd/Ctrl + B)
	useEffect(() => {
		let lastToggleTime = 0
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
				event.preventDefault()
				// Debounce to prevent double-firing in React Strict Mode
				const now = Date.now()
				if (now - lastToggleTime < 100) return
				lastToggleTime = now
				toggle()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [toggle])

	return (
		<SidebarContext.Provider
			value={{
				isCollapsed,
				isInitialized,
				isPinned,
				toggle,
				setCollapsed,
				setPinned
			}}
		>
			{children}
		</SidebarContext.Provider>
	)
}

export function useSidebarState() {
	const context = useContext(SidebarContext)
	if (!context) {
		throw new Error('useSidebarState must be used within a SidebarProvider')
	}
	return context
}
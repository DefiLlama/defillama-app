import { useEffect } from 'react'

const ATTR = 'data-llamaai-fullscreen'

export function useHideGlobalNav() {
	useEffect(() => {
		const root = document.documentElement
		const had = root.getAttribute(ATTR) === 'true'
		root.setAttribute(ATTR, 'true')
		return () => {
			if (!had) root.removeAttribute(ATTR)
		}
	}, [])
}

import { useEffect, useRef, useState } from 'react'

const KEYBOARD_THRESHOLD = 150

export function useVisualViewport() {
	const [keyboardOpen, setKeyboardOpen] = useState(false)
	const [viewportHeight, setViewportHeight] = useState<number | null>(null)
	const rafRef = useRef(0)

	useEffect(() => {
		const vv = window.visualViewport
		if (!vv) return

		function update() {
			rafRef.current = 0
			const height = vv!.height
			const isOpen = window.innerHeight - height > KEYBOARD_THRESHOLD
			setKeyboardOpen(isOpen)
			setViewportHeight(isOpen ? height : null)
		}

		function onResize() {
			if (rafRef.current) return
			rafRef.current = requestAnimationFrame(update)
		}

		vv.addEventListener('resize', onResize)
		update()

		return () => {
			vv.removeEventListener('resize', onResize)
			if (rafRef.current) cancelAnimationFrame(rafRef.current)
		}
	}, [])

	return { keyboardOpen, viewportHeight }
}

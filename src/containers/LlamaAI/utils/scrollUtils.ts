import type React from 'react'

export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
	let timeoutId: number | null = null
	let lastRan: number = 0

	return ((...args: Parameters<T>) => {
		const now = Date.now()

		if (!lastRan) {
			func(...args)
			lastRan = now
		} else {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
			timeoutId = window.setTimeout(
				() => {
					if (now - lastRan >= delay) {
						func(...args)
						lastRan = now
					}
				},
				delay - (now - lastRan)
			)
		}
	}) as T
}

// Debounce utility function
export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
	let timeoutId: number | null = null

	return ((...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = window.setTimeout(() => {
			func(...args)
		}, delay)
	}) as T
}

export function syncHighlightScroll(
	promptInputRef: React.RefObject<HTMLTextAreaElement | null>,
	highlightRef: React.RefObject<HTMLDivElement | null>
) {
	if (promptInputRef?.current && highlightRef?.current) {
		highlightRef.current.scrollTop = promptInputRef.current.scrollTop
		highlightRef.current.scrollLeft = promptInputRef.current.scrollLeft
	}
}

export function setInputSize(
	promptInputRef: React.RefObject<HTMLTextAreaElement | null>,
	highlightRef: React.RefObject<HTMLDivElement | null>
) {
	try {
		const textarea = promptInputRef?.current
		if (!textarea) return

		const style = window.getComputedStyle(textarea)
		const lineHeight = parseFloat(style.lineHeight || '') || parseFloat(style.fontSize || '16') * 1.5
		const paddingTop = parseFloat(style.paddingTop || '0')
		const paddingBottom = parseFloat(style.paddingBottom || '0')
		const maxRows = 5
		const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom

		textarea.style.height = 'auto'
		const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
		textarea.style.height = `${nextHeight}px`

		if (highlightRef?.current) {
			requestAnimationFrame(() => {
				if (!textarea || !highlightRef.current) return
				highlightRef.current.style.height = `${textarea.offsetHeight}px`
				syncHighlightScroll(promptInputRef, highlightRef)
			})
		}
	} catch (error) {
		console.log('Error calculating size:', error)
	}
}

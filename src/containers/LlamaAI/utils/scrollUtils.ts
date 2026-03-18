import type React from 'react'

export function syncHighlightScroll(
	promptInputRef: React.RefObject<HTMLTextAreaElement | null>,
	highlightRef: React.RefObject<HTMLDivElement | null>
) {
	if (promptInputRef?.current && highlightRef?.current) {
		highlightRef.current.scrollTop = promptInputRef.current.scrollTop
		highlightRef.current.scrollLeft = promptInputRef.current.scrollLeft
	}
}

// Cache for computed style values to avoid repeated getComputedStyle calls
const styleCache = new WeakMap<HTMLTextAreaElement, { lineHeight: number; paddingTop: number; paddingBottom: number }>()

function getCachedStyleValues(textarea: HTMLTextAreaElement) {
	let cached = styleCache.get(textarea)
	if (!cached) {
		const style = window.getComputedStyle(textarea)
		cached = {
			lineHeight: parseFloat(style.lineHeight || '') || parseFloat(style.fontSize || '16') * 1.5,
			paddingTop: parseFloat(style.paddingTop || '0'),
			paddingBottom: parseFloat(style.paddingBottom || '0')
		}
		styleCache.set(textarea, cached)
	}
	return cached
}

export function setInputSize(
	promptInputRef: React.RefObject<HTMLTextAreaElement | null>,
	highlightRef: React.RefObject<HTMLDivElement | null>
) {
	try {
		const textarea = promptInputRef?.current
		if (!textarea) return

		// Use cached style values to avoid expensive getComputedStyle calls
		const { lineHeight, paddingTop, paddingBottom } = getCachedStyleValues(textarea)
		const maxRows = 5
		const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom

		// Batch: reset height, read scrollHeight, set final height in single frame
		textarea.style.height = '0'
		const scrollHeight = textarea.scrollHeight
		const nextHeight = Math.min(scrollHeight, maxHeight)
		textarea.style.height = `${nextHeight}px`
		textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'

		if (highlightRef?.current) {
			highlightRef.current.style.height = `${nextHeight}px`
			highlightRef.current.style.overflowY = textarea.style.overflowY
			syncHighlightScroll(promptInputRef, highlightRef)
		}
	} catch (error) {
		console.log('Error calculating size:', error)
	}
}

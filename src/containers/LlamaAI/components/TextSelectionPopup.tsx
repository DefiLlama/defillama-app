import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PopupPosition {
	top: number
	left: number
}

export function TextSelectionPopup({ onSelect }: { onSelect: (text: string) => void }) {
	const [selectedText, setSelectedText] = useState('')
	const [position, setPosition] = useState<PopupPosition | null>(null)
	const popupRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		const handleMouseUp = () => {
			setTimeout(() => {
				const selection = window.getSelection()
				const text = selection?.toString().trim() || ''

				if (text.length < 3) {
					setSelectedText('')
					setPosition(null)
					return
				}

				const anchorNode = selection?.anchorNode
				if (anchorNode) {
					const el = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
					if (el?.closest('textarea, input, [contenteditable]')) {
						setSelectedText('')
						setPosition(null)
						return
					}
				}

				const range = selection?.getRangeAt(0)
				if (!range) return
				const rect = range.getBoundingClientRect()

				setSelectedText(text.slice(0, 2000))
				setPosition({
					top: rect.top + window.scrollY - 36,
					left: rect.left + window.scrollX + rect.width / 2
				})
			}, 10)
		}

		const handleMouseDown = (e: MouseEvent) => {
			if (popupRef.current?.contains(e.target as Node)) return
			setSelectedText('')
			setPosition(null)
		}

		document.addEventListener('mouseup', handleMouseUp)
		document.addEventListener('mousedown', handleMouseDown)
		return () => {
			document.removeEventListener('mouseup', handleMouseUp)
			document.removeEventListener('mousedown', handleMouseDown)
		}
	}, [])

	const handleClick = () => {
		onSelect(selectedText)
		setSelectedText('')
		setPosition(null)
		window.getSelection()?.removeAllRanges()
	}

	if (!selectedText || !position) return null

	return createPortal(
		<button
			ref={popupRef}
			onClick={handleClick}
			style={{
				position: 'absolute',
				top: position.top,
				left: position.left,
				transform: 'translateX(-50%)',
				zIndex: 9999,
				animation: 'llamaPopupIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
			}}
			className="flex items-center gap-1.5 rounded-full border border-[#e6e6e6] bg-white/90 px-3 py-1.5 text-xs font-medium text-[#333] shadow-[0_2px_12px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-95 dark:border-[#39393E] dark:bg-[#1a1a1d]/90 dark:text-[#ccc] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
		>
			<img src="/assets/llamaai/llama-ai.svg" alt="" className="h-3.5 w-3.5" />
			Ask LlamaAI
		</button>,
		document.body
	)
}

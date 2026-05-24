import { useCallback, useEffect, useRef } from 'react'
import { useHackerMode } from '~/containers/LlamaAI/components/status/useHackerMode'

export function ThinkingPanel({ thinking, defaultOpen = false }: { thinking: string; defaultOpen?: boolean }) {
	const detailsRef = useRef<HTMLDetailsElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const shouldAutoScrollRef = useRef(true)
	const hackerMode = useHackerMode()

	const syncAutoScrollIntent = useCallback(() => {
		const content = contentRef.current
		if (!content) return
		shouldAutoScrollRef.current = Math.ceil(content.scrollTop + content.clientHeight) >= content.scrollHeight - 16
	}, [])

	const scrollContentToBottom = useCallback((force = false) => {
		requestAnimationFrame(() => {
			const content = contentRef.current
			if (!content || (!force && !shouldAutoScrollRef.current)) return
			content.scrollTop = content.scrollHeight
			shouldAutoScrollRef.current = true
		})
	}, [])

	useEffect(() => {
		if (defaultOpen && detailsRef.current) {
			detailsRef.current.open = true
			scrollContentToBottom(true)
		}
	}, [defaultOpen, scrollContentToBottom])

	useEffect(() => {
		if (detailsRef.current?.open) {
			scrollContentToBottom()
		}
	}, [thinking, scrollContentToBottom])

	if (!thinking) return null

	return (
		<details
			ref={detailsRef}
			className="group"
			onToggle={() => {
				if (detailsRef.current?.open) {
					scrollContentToBottom(true)
				}
			}}
		>
			<summary
				className={
					hackerMode
						? 'flex items-center gap-1 text-xs text-[#00ff41] drop-shadow-[0_0_6px_rgba(0,255,65,0.5)]'
						: 'flex items-center gap-1 text-xs text-[#555] dark:text-[#aaa]'
				}
			>
				<span className="inline-block transition-transform duration-150 group-open:rotate-90">&#9656;</span>
				<span>{hackerMode ? <>{'>'} decrypting&hellip;</> : 'Reasoning'}</span>
			</summary>
			<div
				ref={contentRef}
				onScroll={syncAutoScrollIntent}
				className={
					hackerMode
						? 'mt-1 h-[160px] min-h-[40px] resize-y overflow-y-auto rounded-md border border-[#00ff41]/20 bg-[#0d0d0d] p-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap text-[#00ff41] shadow-[inset_0_0_30px_rgba(0,255,65,0.03)] drop-shadow-[0_0_4px_rgba(0,255,65,0.3)]'
						: 'mt-1 h-[120px] min-h-[40px] resize-y overflow-y-auto pl-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap text-[#555] dark:text-[#aaa]'
				}
				style={hackerMode ? { textShadow: '0 0 8px rgba(0,255,65,0.4)' } : undefined}
			>
				{thinking}
			</div>
		</details>
	)
}

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Message } from '~/containers/LlamaAI/types'

export function SectionsTOC({
	messages,
	scrollContainerRef
}: {
	messages: Message[]
	scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
	const [activeId, setActiveId] = useState<string | null>(null)
	const [sections, setSections] = useState<Array<{ id: string; text: string }>>([])
	const lastObservedMsgId = useRef<string | null>(null)

	// Identify which message IDs have potential sections (assistant messages with ## headings)
	const sectionMessageIds = useMemo(() => {
		const ids: string[] = []
		for (const msg of messages) {
			if (msg.role === 'assistant' && msg.content && msg.id) {
				// Quick check: at least 2 h2 headings in raw markdown
				const h2Count = (msg.content.match(/^## .+$/gm) || []).length
				if (h2Count >= 2) ids.push(msg.id)
			}
		}
		return ids
	}, [messages])

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || sectionMessageIds.length === 0) {
			lastObservedMsgId.current = null
			setSections([])
			setActiveId(null)
			return
		}

		const handleScroll = () => {
			const containerRect = container.getBoundingClientRect()
			const containerMid = containerRect.top + containerRect.height / 2

			// Find the most visible message that has sections
			let bestMsgId: string | null = null
			let bestDistance = Infinity

			for (const msgId of sectionMessageIds) {
				const el = document.getElementById(`msg-${msgId}`)
				if (!el) continue
				const rect = el.getBoundingClientRect()
				if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) continue
				const distance = Math.abs(rect.top + rect.height / 2 - containerMid)
				if (distance < bestDistance) {
					bestDistance = distance
					bestMsgId = msgId
				}
			}

			// Read sections from the DOM for the visible message
			if (bestMsgId) {
				lastObservedMsgId.current = bestMsgId
				const headings = container.querySelectorAll(`h2[data-section-msg="${bestMsgId}"]`)
				const newSections: Array<{ id: string; text: string }> = []
				for (const h of headings) {
					if (h.id && h.textContent) {
						newSections.push({ id: h.id, text: h.textContent.trim() })
					}
				}
				setSections(newSections.length >= 2 ? newSections : [])
			} else if (!bestMsgId) {
				lastObservedMsgId.current = null
				setSections([])
			}

			// Active heading: last one whose top scrolled past the container top.
			// Stays active until the next heading reaches the top.
			const visibleMsgId = bestMsgId ?? lastObservedMsgId.current
			if (visibleMsgId) {
				const headings = container.querySelectorAll(`[data-section-msg="${visibleMsgId}"]`)
				let current: string | null = null
				for (const heading of headings) {
					if (heading.getBoundingClientRect().top - containerRect.top <= 20) {
						current = heading.id
					}
				}
				// If no heading has scrolled past yet, highlight the first one
				setActiveId(current ?? (headings.length > 0 ? headings[0].id : null))
			} else {
				setActiveId(null)
			}
		}

		container.addEventListener('scroll', handleScroll, { passive: true })
		handleScroll()
		return () => container.removeEventListener('scroll', handleScroll)
	}, [sectionMessageIds, scrollContainerRef])

	const scrollToSection = useCallback((id: string) => {
		const el = document.getElementById(id)
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [])

	if (sections.length < 2) return null

	return (
		<nav className="sticky top-0 hidden thin-scrollbar max-h-dvh w-56 shrink-0 overflow-y-auto py-6 pr-2 xl:block">
			<p className="mb-3 text-sm font-semibold text-[#333] dark:text-[#ccc]">Sections</p>
			<ol className="flex flex-col gap-0.5">
				{sections.map((section, i) => {
					const isActive = activeId === section.id
					return (
						<li key={section.id}>
							<button
								type="button"
								onClick={() => scrollToSection(section.id)}
								className={`flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ${
									isActive
										? 'bg-[#f0f0f0] font-medium text-[#111] dark:bg-[#222324] dark:text-white'
										: 'text-[#666] hover:bg-[#f7f7f7] hover:text-[#333] dark:text-[#919296] dark:hover:bg-[#1a1b1d] dark:hover:text-[#ccc]'
								}`}
								title={section.text}
							>
								<span
									className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium ${
										isActive
											? 'bg-[#4f8fba] text-white dark:bg-[#4f8fba]'
											: 'bg-[#e8e8e8] text-[#666] dark:bg-[#2a2b2d] dark:text-[#919296]'
									}`}
								>
									{i + 1}
								</span>
								<span className="line-clamp-2">{section.text}</span>
							</button>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

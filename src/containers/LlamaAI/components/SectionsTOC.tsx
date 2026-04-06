import { useCallback, useEffect, useMemo, useState } from 'react'
import { headingSlug } from '~/containers/LlamaAI/components/markdown/ChatMarkdownRenderer'
import type { Message } from '~/containers/LlamaAI/types'

type Section = {
	text: string
	id: string
}

function extractSections(content: string, messageId?: string): Section[] {
	const sections: Section[] = []
	const lines = content.split('\n')
	for (const line of lines) {
		const match = line.match(/^(##)\s+(.+)$/)
		if (match) {
			const text = match[2].replace(/\*\*/g, '').replace(/\*/g, '').trim()
			const slug = headingSlug(text)
			const id = messageId ? `${messageId}--${slug}` : slug
			sections.push({ text, id })
		}
	}
	return sections
}

type MessageSections = { messageId: string; sections: Section[] }

export function SectionsTOC({
	messages,
	scrollContainerRef
}: {
	messages: Message[]
	scrollContainerRef: React.RefObject<HTMLDivElement | null>
}) {
	const [activeId, setActiveId] = useState<string | null>(null)
	const [visibleMessageId, setVisibleMessageId] = useState<string | null>(null)

	// Pre-compute sections for all assistant messages with 2+ headings
	const messageSectionsMap = useMemo(() => {
		const result: MessageSections[] = []
		for (const msg of messages) {
			if (msg.role === 'assistant' && msg.content && msg.id) {
				const sections = extractSections(msg.content, msg.id)
				if (sections.length >= 2) {
					result.push({ messageId: msg.id, sections })
				}
			}
		}
		return result
	}, [messages])

	// Track which message with sections is currently most visible
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || messageSectionsMap.length === 0) return

		const handleScroll = () => {
			const containerRect = container.getBoundingClientRect()
			const containerMid = containerRect.top + containerRect.height / 2
			let bestId: string | null = null
			let bestDistance = Infinity

			for (const { messageId } of messageSectionsMap) {
				const el = container.querySelector(`#msg-${messageId}`)
				if (!el) continue
				const rect = el.getBoundingClientRect()
				// Check if the message overlaps the viewport
				if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) continue
				const distance = Math.abs(rect.top + rect.height / 2 - containerMid)
				if (distance < bestDistance) {
					bestDistance = distance
					bestId = messageId
				}
			}

			setVisibleMessageId(bestId)

			// Track active heading within the visible message
			if (bestId) {
				const headings = container.querySelectorAll(`[data-section-heading][id^="${bestId}--"]`)
				let current: string | null = null
				for (const heading of headings) {
					const rect = heading.getBoundingClientRect()
					if (rect.top - containerRect.top <= 100) {
						current = heading.id
					}
				}
				setActiveId(current)
			} else {
				setActiveId(null)
			}
		}

		container.addEventListener('scroll', handleScroll, { passive: true })
		handleScroll()
		return () => container.removeEventListener('scroll', handleScroll)
	}, [messageSectionsMap, scrollContainerRef])

	const scrollToSection = useCallback(
		(id: string) => {
			const container = scrollContainerRef.current
			if (!container) return
			const el = container.querySelector(`#${CSS.escape(id)}`)
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		},
		[scrollContainerRef]
	)

	const visibleSections = messageSectionsMap.find((ms) => ms.messageId === visibleMessageId)?.sections
	if (!visibleSections || visibleSections.length < 2) return null

	return (
		<nav className="sticky top-0 hidden thin-scrollbar max-h-dvh w-56 shrink-0 overflow-y-auto py-6 pr-2 xl:block">
			<p className="mb-3 text-sm font-semibold text-[#333] dark:text-[#ccc]">Sections</p>
			<ol className="flex flex-col gap-0.5">
				{visibleSections.map((section, i) => {
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

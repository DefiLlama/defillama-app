import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Message } from '~/containers/LlamaAI/types'

type Section = { text: string; msgId: string }

function parseSections(messages: Message[]): Section[] {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg.role !== 'assistant' || !msg.content || !msg.id) continue
		const matches = [...msg.content.matchAll(/^## (.+)$/gm)]
		if (matches.length < 2) continue
		return matches.map((m) => ({ text: m[1].trim(), msgId: msg.id! }))
	}
	return []
}

function getHeadings(container: HTMLElement, msgId: string) {
	return container.querySelectorAll<HTMLElement>(`h2[data-section-msg="${msgId}"]`)
}

export function SectionsTOC({
	messages,
	scrollContainerRef
}: {
	messages: Message[]
	scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
	const sections = useMemo(() => parseSections(messages), [messages])
	const [activeIndex, setActiveIndex] = useState(0)
	const clickLockUntil = useRef(0)

	useEffect(() => {
		setActiveIndex(0)
	}, [sections])

	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container || sections.length < 2) return

		const msgId = sections[0].msgId

		const detectActive = () => {
			if (Date.now() < clickLockUntil.current) return
			const rect = container.getBoundingClientRect()
			const threshold = rect.top + rect.height * 0.35
			const headings = getHeadings(container, msgId)
			let idx = 0
			for (let i = 0; i < headings.length; i++) {
				if (headings[i].getBoundingClientRect().top <= threshold) {
					idx = i
				}
			}
			setActiveIndex(idx)
		}

		const raf = requestAnimationFrame(detectActive)
		container.addEventListener('scroll', detectActive, { passive: true })
		return () => {
			cancelAnimationFrame(raf)
			container.removeEventListener('scroll', detectActive)
		}
	}, [sections, scrollContainerRef])

	const handleClick = (index: number) => {
		const container = scrollContainerRef.current
		if (!container) return
		setActiveIndex(index)
		clickLockUntil.current = Date.now() + 800
		const headings = getHeadings(container, sections[0].msgId)
		headings[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	if (sections.length < 2) return <div className="w-0 shrink-0" />

	return (
		<div className="w-0 shrink-0">
			<nav className="sticky top-0 hidden thin-scrollbar max-h-dvh w-56 -translate-x-full overflow-y-auto py-6 pr-4 min-[1428px]:block">
				<p className="mb-3 text-sm font-semibold text-[#333] dark:text-[#ccc]">Sections</p>
				<ol className="flex flex-col gap-0.5">
					{sections.map((section, i) => {
						const isActive = activeIndex === i
						return (
							<li key={i}>
								<button
									type="button"
									onClick={() => handleClick(i)}
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
		</div>
	)
}

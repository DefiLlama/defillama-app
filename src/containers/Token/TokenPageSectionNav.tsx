import { useEffect, useMemo, useRef, useState } from 'react'

type TokenPageSectionNavItem = {
	id: string
	label: string
}

export function TokenPageSectionNav({ sections }: { sections: TokenPageSectionNavItem[] }) {
	const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '')
	const observerEntries = useRef(new Map<string, IntersectionObserverEntry>())
	const navRef = useRef<HTMLElement | null>(null)
	const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
	const clickLockTargetId = useRef<string | null>(null)
	const sectionIds = useMemo(() => sections.map((section) => section.id), [sections])
	const initialHashSectionId = useMemo(() => {
		if (typeof window === 'undefined') return null
		const hashSectionId = window.location.hash.slice(1)
		return sectionIds.includes(hashSectionId) ? hashSectionId : null
	}, [sectionIds])

	const syncActiveSection = (nextActiveSectionId: string) => {
		setActiveSectionId((currentActiveSectionId) => {
			if (currentActiveSectionId === nextActiveSectionId) return currentActiveSectionId

			return nextActiveSectionId
		})
	}

	useEffect(() => {
		if (initialHashSectionId) {
			setActiveSectionId(initialHashSectionId)
			return
		}

		if (sectionIds[0]) {
			setActiveSectionId(sectionIds[0])
		}
	}, [initialHashSectionId, sectionIds])

	useEffect(() => {
		if (!activeSectionId) return

		const navElement = navRef.current
		const linkElement = linkRefs.current[activeSectionId]
		if (!navElement || !linkElement) return

		const navRect = navElement.getBoundingClientRect()
		const linkRect = linkElement.getBoundingClientRect()
		const linkLeft = linkRect.left - navRect.left + navElement.scrollLeft
		const linkRight = linkLeft + linkRect.width
		const visibleLeft = navElement.scrollLeft
		const visibleRight = visibleLeft + navElement.clientWidth

		if (linkLeft < visibleLeft) {
			navElement.scrollLeft = linkLeft
		} else if (linkRight > visibleRight) {
			navElement.scrollLeft = linkRight - navElement.clientWidth
		}
	}, [activeSectionId])

	useEffect(() => {
		if (sectionIds.length === 0 || typeof window === 'undefined') return
		const observerEntriesMap = observerEntries.current

		const maybeReleaseClickLock = () => {
			if (!clickLockTargetId.current) return false

			const targetElement = document.getElementById(clickLockTargetId.current)
			if (targetElement && targetElement.getBoundingClientRect().top <= 140) {
				clickLockTargetId.current = null
				return true
			}

			return false
		}

		const updateFromObserver = () => {
			if (clickLockTargetId.current && !maybeReleaseClickLock()) return

			const candidateEntries = sectionIds
				.map((sectionId) => observerEntries.current.get(sectionId))
				.filter((entry): entry is IntersectionObserverEntry => Boolean(entry?.isIntersecting))

			if (candidateEntries.length === 0) return

			const entriesById = new Map(candidateEntries.map((entry) => [entry.target.id, entry]))
			const entriesAtThreshold = sectionIds.filter((sectionId) => {
				const entry = entriesById.get(sectionId)
				return entry ? entry.boundingClientRect.top <= 140 : false
			})

			const nextActiveSectionId =
				entriesAtThreshold.at(-1) ??
				candidateEntries.slice().sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0].target.id

			syncActiveSection(nextActiveSectionId)
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					observerEntriesMap.set(entry.target.id, entry)
				}
				updateFromObserver()
			},
			{
				rootMargin: '-140px 0px -60% 0px',
				threshold: [0, 1]
			}
		)

		for (const sectionId of sectionIds) {
			const sectionElement = document.getElementById(sectionId)
			if (sectionElement) observer.observe(sectionElement)
		}

		const frameId = window.requestAnimationFrame(() => {
			if (!initialHashSectionId) {
				updateFromObserver()
			}
		})

		const handleScrollEnd = () => {
			if (!clickLockTargetId.current) return
			clickLockTargetId.current = null
			updateFromObserver()
		}

		if ('onscrollend' in window) {
			window.addEventListener('scrollend', handleScrollEnd, { passive: true })
		}

		return () => {
			window.cancelAnimationFrame(frameId)
			if ('onscrollend' in window) {
				window.removeEventListener('scrollend', handleScrollEnd)
			}
			observer.disconnect()
			observerEntriesMap.clear()
		}
	}, [initialHashSectionId, sectionIds])

	if (sections.length === 0) return null

	return (
		<div className="sticky top-0 z-20 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<nav ref={navRef} className="flex w-full overflow-x-auto text-sm font-medium" aria-label="Token page sections">
				{sections.map((section) => {
					const isActive = activeSectionId === section.id

					return (
						<a
							key={section.id}
							href={`#${section.id}`}
							ref={(element) => {
								if (!element) return
								linkRefs.current[section.id] = element
								return () => {
									delete linkRefs.current[section.id]
								}
							}}
							aria-current={isActive ? 'location' : undefined}
							onClick={() => {
								setActiveSectionId(section.id)
								clickLockTargetId.current = section.id
							}}
							data-active={isActive}
							className="shrink-0 border-b-2 border-transparent px-4 py-3 whitespace-nowrap text-(--text-secondary) hover:bg-(--btn-hover-bg) hover:text-(--text-primary) focus-visible:bg-(--btn-hover-bg) focus-visible:text-(--text-primary) data-[active=true]:border-(--primary) data-[active=true]:text-(--text-primary)"
						>
							{section.label}
						</a>
					)
				})}
			</nav>
		</div>
	)
}

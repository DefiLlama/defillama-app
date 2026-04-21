import { useEffect, useMemo, useRef, useState } from 'react'

type TokenPageSectionNavItem = {
	id: string
	label: string
}

function getCurrentUrlWithHash(hash: string) {
	return `${window.location.pathname}${window.location.search}${hash}`
}

export function TokenPageSectionNav({ sections }: { sections: TokenPageSectionNavItem[] }) {
	const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '')
	const clickLockUntil = useRef(0)
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
	const sectionIds = useMemo(() => sections.map((section) => section.id), [sections])

	useEffect(() => {
		const matchingHash = window.location.hash.slice(1)
		if (sectionIds.includes(matchingHash)) {
			setActiveSectionId(matchingHash)
		} else if (sectionIds[0]) {
			setActiveSectionId(sectionIds[0])
		}
	}, [sectionIds])

	useEffect(() => {
		if (!activeSectionId) return
		buttonRefs.current[activeSectionId]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [activeSectionId])

	useEffect(() => {
		if (sectionIds.length === 0) return

		const detectActiveSection = () => {
			if (Date.now() < clickLockUntil.current) return

			const threshold = 140
			let nextActiveSectionId = sectionIds[0]

			for (const sectionId of sectionIds) {
				const sectionElement = document.getElementById(sectionId)
				if (!sectionElement) continue

				if (sectionElement.getBoundingClientRect().top <= threshold) {
					nextActiveSectionId = sectionId
				}
			}

			setActiveSectionId((currentActiveSectionId) => {
				if (currentActiveSectionId === nextActiveSectionId) return currentActiveSectionId

				window.history.replaceState(window.history.state, '', getCurrentUrlWithHash(`#${nextActiveSectionId}`))
				return nextActiveSectionId
			})
		}

		detectActiveSection()
		window.addEventListener('scroll', detectActiveSection, { passive: true })
		window.addEventListener('resize', detectActiveSection)

		return () => {
			window.removeEventListener('scroll', detectActiveSection)
			window.removeEventListener('resize', detectActiveSection)
		}
	}, [sectionIds])

	if (sections.length === 0) return null

	return (
		<div className="sticky top-0 z-20 overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<nav className="flex w-full overflow-x-auto text-sm font-medium" aria-label="Token page sections">
				{sections.map((section) => {
					const isActive = activeSectionId === section.id

					return (
						<button
							key={section.id}
							type="button"
							ref={(element) => {
								buttonRefs.current[section.id] = element
							}}
							aria-pressed={isActive}
							onClick={() => {
								setActiveSectionId(section.id)
								clickLockUntil.current = Date.now() + 800
								window.history.replaceState(window.history.state, '', getCurrentUrlWithHash(`#${section.id}`))
								document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
							}}
							data-active={isActive}
							className="shrink-0 border-b-2 border-transparent px-4 py-3 whitespace-nowrap text-(--text-secondary) hover:bg-(--btn-hover-bg) hover:text-(--text-primary) focus-visible:bg-(--btn-hover-bg) focus-visible:text-(--text-primary) data-[active=true]:border-(--primary) data-[active=true]:text-(--text-primary)"
						>
							{section.label}
						</button>
					)
				})}
			</nav>
		</div>
	)
}

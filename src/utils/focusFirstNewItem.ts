export function focusFirstNewItem(
	containerRef: React.RefObject<HTMLElement | null>,
	selector: string,
	previousCount: number
): void {
	setTimeout(() => {
		const items = containerRef.current?.querySelectorAll(selector)
		if (items && items.length > previousCount) {
			const firstNewItem = items.item(previousCount)
			if (firstNewItem instanceof HTMLElement) {
				firstNewItem.focus()
			}
		}
	}, 0)
}

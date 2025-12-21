export const BORROWED_CHART_OPTIONS = {
	grid: {
		left: 12,
		bottom: 68,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}

export const BORROWED_CHART_TYPES = [
	{ value: 'chainsBorrowed', label: 'Borrowed by Chain' },
	{ value: 'tokenBorrowedUsd', label: 'Borrowed by Token (USD)' },
	{ value: 'tokensBorrowedPie', label: 'Borrowed Tokens Breakdown (USD)' },
	{ value: 'tokenBorrowedRaw', label: 'Borrowed by Token (Raw Quantities)' }
] as const

export const BORROWED_CHART_TYPE_LABELS: Record<string, string> = Object.fromEntries(
	BORROWED_CHART_TYPES.map(({ value, label }) => [value, label])
)

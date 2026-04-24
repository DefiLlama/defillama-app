export function buildHallmarksMarkLine({
	hallmarks,
	isThemeDark,
	dateInMs = false
}: {
	hallmarks: [number, string][]
	isThemeDark: boolean
	dateInMs?: boolean
}) {
	const sorted = [...hallmarks].sort((a, b) => +a[0] - +b[0])

	return {
		label: {
			position: 'end' as const,
			width: 200,
			color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
			fontFamily: 'sans-serif',
			overflow: 'truncate' as const,
			rotate: 0,
			distance: 6,
			formatter: (params: { name?: string; data?: { name?: string } }) => params.name ?? params.data?.name ?? ''
		},
		data: sorted.map(([date, event]) => {
			const xAxis = dateInMs ? +date : +date * 1e3
			return {
				name: event,
				xAxis
			}
		})
	}
}

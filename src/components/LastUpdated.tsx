import * as React from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type GeneratedAt = string | number | Date

interface LastUpdatedProps {
	generatedAt?: GeneratedAt
	className?: string
}

const LastUpdatedContext = React.createContext<GeneratedAt | undefined>(undefined)

export function LastUpdatedProvider({
	generatedAt,
	children
}: {
	generatedAt?: GeneratedAt
	children: React.ReactNode
}) {
	return <LastUpdatedContext.Provider value={generatedAt}>{children}</LastUpdatedContext.Provider>
}

function formatGeneratedAt(generatedAt: LastUpdatedProps['generatedAt']) {
	if (!generatedAt) return null

	const date = new Date(generatedAt)
	if (!Number.isFinite(date.getTime())) return null

	const day = String(date.getUTCDate()).padStart(2, '0')
	const month = MONTHS[date.getUTCMonth()]
	const year = date.getUTCFullYear()
	const hours = String(date.getUTCHours()).padStart(2, '0')
	const minutes = String(date.getUTCMinutes()).padStart(2, '0')

	return {
		dateTime: date.toISOString(),
		label: `${day} ${month} ${year}, ${hours}:${minutes} UTC`
	}
}

export function LastUpdated({ generatedAt, className }: LastUpdatedProps) {
	const contextGeneratedAt = React.useContext(LastUpdatedContext)
	const formatted = formatGeneratedAt(generatedAt ?? contextGeneratedAt)
	if (!formatted) return null

	return (
		<p className={className ?? 'text-right text-xs text-(--text-tertiary)'}>
			Last updated{' '}
			<time dateTime={formatted.dateTime} title={formatted.dateTime}>
				{formatted.label}
			</time>
		</p>
	)
}

import { useEffect, useState } from 'react'
import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile'

interface TurnstileProps {
	onVerify: (token: string) => void
	onError?: () => void
	onExpire?: () => void
	className?: string
}

export const Turnstile = ({ onVerify, onError, onExpire, className }: TurnstileProps) => {
	const [theme, setTheme] = useState<'light' | 'dark'>('dark')
	const siteKey = '0x4AAAAAABjeuAHi7HNPyGmv'

	useEffect(() => {
		const isDark =
			document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches
		setTheme(isDark ? 'dark' : 'light')

		const observer = new MutationObserver(() => {
			const isDark = document.documentElement.classList.contains('dark')
			setTheme(isDark ? 'dark' : 'light')
		})

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		})

		return () => observer.disconnect()
	}, [])

	if (!siteKey) {
		console.error('Turnstile site key is not configured')
		return null
	}

	return (
		<div className={className}>
			<TurnstileWidget
				siteKey={siteKey}
				onSuccess={onVerify}
				onError={onError}
				onExpire={onExpire}
				options={{
					theme,
					size: 'normal',
					appearance: 'always'
				}}
			/>
		</div>
	)
}

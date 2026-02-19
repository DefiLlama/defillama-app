import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile'
import { useEffect, useState } from 'react'

interface TurnstileProps {
	onVerify: (token: string) => void
	onError?: () => void
	onExpire?: () => void
	className?: string
}

const getCurrentTheme = (): 'light' | 'dark' => {
	if (typeof document === 'undefined' || typeof window === 'undefined') return 'dark'
	const hasDarkClass = document.documentElement.classList.contains('dark')
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
	return hasDarkClass || prefersDark ? 'dark' : 'light'
}

export const Turnstile = ({ onVerify, onError, onExpire, className }: TurnstileProps) => {
	const [theme, setTheme] = useState<'light' | 'dark'>(() => getCurrentTheme())
	const siteKey = '0x4AAAAAABjeuAHi7HNPyGmv'

	useEffect(() => {
		const handleThemeChange = () => {
			setTheme(getCurrentTheme())
		}

		const observer = new MutationObserver(handleThemeChange)
		const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		})
		mediaQueryList.addEventListener('change', handleThemeChange)

		return () => {
			observer.disconnect()
			mediaQueryList.removeEventListener('change', handleThemeChange)
		}
	}, [])

	if (!siteKey) {
		console.log('Turnstile site key is not configured')
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

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface TurnstileProps {
	onVerify: (token: string) => void
	onError?: () => void
	onExpire?: () => void
	className?: string
}

export const Turnstile = ({ onVerify, onError, onExpire, className }: TurnstileProps) => {
	const [isDarkMode] = useDarkModeManager()
	const theme: 'light' | 'dark' = isDarkMode ? 'dark' : 'light'
	const siteKey = '0x4AAAAAABjeuAHi7HNPyGmv'

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

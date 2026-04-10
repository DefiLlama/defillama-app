import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const COOLDOWN_SECONDS = 60

export interface ResendCooldownHandle {
	start: () => void
}

interface ResendCooldownProps {
	onResend: () => void
	disabled?: boolean
}

export const ResendCooldown = forwardRef<ResendCooldownHandle, ResendCooldownProps>(function ResendCooldown(
	{ onResend, disabled },
	ref
) {
	const [secondsLeft, setSecondsLeft] = useState(0)
	const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

	const clear = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	const start = useCallback(() => {
		clear()
		setSecondsLeft(COOLDOWN_SECONDS)
		intervalRef.current = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clear()
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}, [clear])

	useImperativeHandle(ref, () => ({ start }), [start])

	useEffect(() => clear, [clear])

	return (
		<div className="flex items-center gap-1 text-sm leading-[21px]">
			<span className="text-(--sub-text-muted)">Didn't receive the code?</span>
			{secondsLeft > 0 ? (
				<span className="text-(--sub-text-muted)">Resend in {secondsLeft}s</span>
			) : (
				<button type="button" onClick={onResend} disabled={disabled} className="text-(--sub-brand-secondary) underline disabled:opacity-50">
					Resend
				</button>
			)}
		</div>
	)
})

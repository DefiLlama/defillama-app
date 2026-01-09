import { useCallback, useEffect, useRef } from 'react'

export function useStreamNotification() {
	const isHiddenRef = useRef(false)

	useEffect(() => {
		const handler = () => {
			isHiddenRef.current = document.hidden
		}
		document.addEventListener('visibilitychange', handler)
		return () => document.removeEventListener('visibilitychange', handler)
	}, [])

	const notify = useCallback(() => {
		if (!isHiddenRef.current) return
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			Notification.requestPermission()
			return
		}
		if (Notification.permission === 'granted') {
			new Notification('LlamaAI', { body: 'Llama has answered your question!', icon: '/favicon.ico' })
			new Audio('/assets/notification.mp3').play().catch(() => {})
		}
	}, [])

	const requestPermission = useCallback(() => {
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			Notification.requestPermission()
		}
	}, [])

	return { notify, requestPermission }
}

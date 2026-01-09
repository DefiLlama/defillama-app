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

	const showNotification = useCallback(() => {
		new Notification('LlamaAI', { body: 'Llama has answered your question!', icon: '/favicon.ico' })
		new Audio('/assets/notification.mp3').play().catch(() => {})
	}, [])

	const notify = useCallback(() => {
		if (!isHiddenRef.current) return
		if (typeof Notification === 'undefined') return

		if (Notification.permission === 'granted') {
			showNotification()
		} else if (Notification.permission === 'default') {
			Notification.requestPermission().then((permission) => {
				if (permission === 'granted') showNotification()
			})
		}
	}, [showNotification])

	const requestPermission = useCallback(() => {
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			Notification.requestPermission()
		}
	}, [])

	return { notify, requestPermission }
}

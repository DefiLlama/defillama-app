import { useCallback, useEffect, useRef } from 'react'

export function useStreamNotification() {
	const isHiddenRef = useRef(false)
	const originalTitleRef = useRef('')
	const originalFaviconRef = useRef('')
	const hasBadgeRef = useRef(false)

	const clearBadge = useCallback(() => {
		if (!hasBadgeRef.current) return
		hasBadgeRef.current = false
		document.title = originalTitleRef.current
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
		if (link && originalFaviconRef.current) link.href = originalFaviconRef.current
	}, [])

	const setBadge = useCallback(() => {
		if (hasBadgeRef.current) return
		hasBadgeRef.current = true
		originalTitleRef.current = document.title
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
		if (link) originalFaviconRef.current = link.href
		document.title = 'LlamaAI (1) - DefiLlama'
		if (link) link.href = '/favicon-badge.png'
	}, [])

	useEffect(() => {
		const handler = () => {
			isHiddenRef.current = document.hidden
			if (!document.hidden) clearBadge()
		}
		document.addEventListener('visibilitychange', handler)
		return () => document.removeEventListener('visibilitychange', handler)
	}, [clearBadge])

	const showNotification = useCallback(() => {
		new Notification('LlamaAI', { body: 'Llama has answered your question!', icon: '/favicon.ico' })
		new Audio('/assets/notification.mp3').play().catch(() => {})
	}, [])

	const notify = useCallback(() => {
		if (!isHiddenRef.current) return

		setBadge()

		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'granted') {
			showNotification()
		} else if (Notification.permission === 'default') {
			Notification.requestPermission().then((permission) => {
				if (permission === 'granted') showNotification()
			})
		}
	}, [showNotification, setBadge])

	const requestPermission = useCallback(() => {
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			Notification.requestPermission()
		}
	}, [])

	return { notify, requestPermission }
}

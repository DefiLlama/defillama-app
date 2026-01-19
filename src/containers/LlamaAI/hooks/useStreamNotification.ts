import { useCallback, useEffect, useRef } from 'react'

export function useStreamNotification() {
	const isHiddenRef = useRef(false)
	const originalTitleRef = useRef('')
	const originalFaviconRef = useRef('')
	const hasBadgeRef = useRef(false)
	const audioRef = useRef<HTMLAudioElement | null>(null)

	useEffect(() => {
		audioRef.current = new Audio('/assets/notification.mp3')
		audioRef.current.load()
	}, [])

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

	const playSound = useCallback(() => {
		if (!audioRef.current) return
		audioRef.current.currentTime = 0
		audioRef.current.play().catch(() => {})
	}, [])

	const showNotification = useCallback(() => {
		const notification = new Notification('LlamaAI', {
			body: 'Llama has answered your question!',
			icon: '/favicon-badge.png'
		})
		void notification
		playSound()
	}, [playSound])

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
		if (audioRef.current) {
			const vol = audioRef.current.volume
			audioRef.current.volume = 0
			audioRef.current
				.play()
				.then(() => {
					if (!audioRef.current) return
					audioRef.current.pause()
					audioRef.current.currentTime = 0
					audioRef.current.volume = vol
				})
				.catch(() => {})
		}
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			Notification.requestPermission()
		}
	}, [])

	return { notify, requestPermission }
}

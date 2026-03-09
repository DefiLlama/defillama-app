import { useCallback, useEffect, useRef } from 'react'

export function useStreamNotification() {
	const isHiddenRef = useRef(false)
	const originalTitleRef = useRef('')
	const originalFaviconRef = useRef('')
	const hasBadgeRef = useRef(false)
	const audioRef = useRef<HTMLAudioElement | null>(null)

	// Preload the notification sound once so later completion notifications can play immediately.
	useEffect(() => {
		const audio = new Audio('/assets/notification.mp3')
		audioRef.current = audio
		audio.load()
		return () => {
			audio.pause()
			audio.removeAttribute('src')
			audio.load()
			audioRef.current = null
		}
	}, [])

	// Restore the original tab title/favicon after the user returns to the tab.
	const clearBadge = useCallback(() => {
		if (!hasBadgeRef.current) return
		hasBadgeRef.current = false
		document.title = originalTitleRef.current
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
		if (link && originalFaviconRef.current) link.href = originalFaviconRef.current
	}, [])

	// Mark the tab as unread while a completed response is waiting in a background tab.
	const setBadge = useCallback(() => {
		if (hasBadgeRef.current) return
		hasBadgeRef.current = true
		originalTitleRef.current = document.title
		const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
		if (link) originalFaviconRef.current = link.href
		document.title = 'LlamaAI (1) - DefiLlama'
		if (link) link.href = '/favicon-badge.png'
	}, [])

	// Track whether the page is hidden so notifications only fire when the user is away.
	useEffect(() => {
		const handler = () => {
			isHiddenRef.current = document.hidden
			if (!document.hidden) clearBadge()
		}
		isHiddenRef.current = document.hidden
		if (!document.hidden) clearBadge()
		document.addEventListener('visibilitychange', handler)
		return () => {
			document.removeEventListener('visibilitychange', handler)
			if (hasBadgeRef.current) clearBadge()
		}
	}, [clearBadge])

	// Reset and replay the short audio cue when a background response completes.
	const playSound = useCallback(() => {
		if (!audioRef.current) return
		audioRef.current.currentTime = 0
		audioRef.current.play().catch((error) => {
			// Audio playback can fail due to autoplay policies - this is expected behavior
			if (error.name !== 'NotAllowedError') {
				console.log('Failed to play notification sound:', error)
			}
		})
	}, [])

	// Use the browser notification API as a secondary signal when permission is available.
	const showNotification = useCallback(() => {
		const notification = new Notification('LlamaAI', {
			body: 'Llama has answered your question!',
			icon: '/favicon-badge.png'
		})
		notification.onclick = () => {
			window.focus()
			window.parent?.focus?.()
			notification.close()
		}
		void notification
	}, [])

	// Notify only when the page is hidden; foreground completions do not need browser-level alerts.
	const notify = useCallback(() => {
		if (!isHiddenRef.current) return

		setBadge()
		playSound()

		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'granted') {
			showNotification()
		} else if (Notification.permission === 'default') {
			void Notification.requestPermission().then((permission) => {
				if (permission === 'granted') showNotification()
			})
		}
	}, [playSound, setBadge, showNotification])

	// Prime both audio playback and notification permission early from an explicit user gesture.
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
				.catch((error) => {
					if (audioRef.current) {
						audioRef.current.pause()
						audioRef.current.currentTime = 0
						audioRef.current.volume = vol
					}
					// Expected when autoplay is blocked - silently ignore
					if (error.name !== 'NotAllowedError') {
						console.log('Failed to initialize audio:', error)
					}
				})
		}
		if (typeof Notification === 'undefined') return
		if (Notification.permission === 'default') {
			void Notification.requestPermission().then((permission) => {
				if (permission === 'denied') {
					console.log('Notification permission was denied by user')
				}
			})
		}
	}, [])

	return { notify, requestPermission }
}

import Router from 'next/router'
import { useEffect, useRef } from 'react'

const SHOW_DELAY_MS = 100
const START_PROGRESS = 0.09
const MAX_TRICKLE_PROGRESS = 0.88
const COMPLETE_HOLD_MS = 180
const RESET_DELAY_MS = 300
const TRICKLE_INTERVAL_MS = 300

const getNextProgress = (progress: number) => {
	if (progress < 0.25) return Math.min(progress + 0.08, MAX_TRICKLE_PROGRESS)
	if (progress < 0.5) return Math.min(progress + 0.035, MAX_TRICKLE_PROGRESS)
	if (progress < 0.75) return Math.min(progress + 0.015, MAX_TRICKLE_PROGRESS)
	return Math.min(progress + 0.005, MAX_TRICKLE_PROGRESS)
}

export const RouteProgressIndicator = () => {
	const containerRef = useRef<HTMLDivElement>(null)
	const barRef = useRef<HTMLDivElement>(null)
	const pendingRoutesRef = useRef(0)
	const progressRef = useRef(0)
	const isShownRef = useRef(false)
	const reduceMotionRef = useRef(false)
	const showTimerRef = useRef<number | null>(null)
	const trickleTimerRef = useRef<number | null>(null)
	const completeTimerRef = useRef<number | null>(null)
	const resetTimerRef = useRef<number | null>(null)

	useEffect(() => {
		const setProgress = (progress: number) => {
			progressRef.current = progress
			if (barRef.current) {
				barRef.current.style.transform = `translate3d(${(progress - 1) * 100}%, 0, 0)`
			}
		}

		const setTransitionDuration = (duration: string) => {
			containerRef.current?.style.setProperty('transition-duration', duration)
			barRef.current?.style.setProperty('transition-duration', duration)
		}

		const clearShowTimer = () => {
			if (showTimerRef.current !== null) {
				window.clearTimeout(showTimerRef.current)
				showTimerRef.current = null
			}
		}

		const clearCompleteTimers = () => {
			if (completeTimerRef.current !== null) {
				window.clearTimeout(completeTimerRef.current)
				completeTimerRef.current = null
			}

			if (resetTimerRef.current !== null) {
				window.clearTimeout(resetTimerRef.current)
				resetTimerRef.current = null
			}
		}

		const clearTrickleTimer = () => {
			if (trickleTimerRef.current !== null) {
				window.clearInterval(trickleTimerRef.current)
				trickleTimerRef.current = null
			}
		}

		const startTrickleTimer = () => {
			if (reduceMotionRef.current) return
			clearTrickleTimer()
			trickleTimerRef.current = window.setInterval(() => {
				setProgress(getNextProgress(progressRef.current))
			}, TRICKLE_INTERVAL_MS)
		}

		const showProgress = () => {
			showTimerRef.current = null
			if (pendingRoutesRef.current === 0) return

			isShownRef.current = true
			containerRef.current?.style.setProperty('opacity', '1')
			setProgress(progressRef.current > 0 && progressRef.current < 1 ? progressRef.current : START_PROGRESS)
			startTrickleTimer()
		}

		const startProgress = () => {
			pendingRoutesRef.current += 1
			clearCompleteTimers()

			if (isShownRef.current) {
				containerRef.current?.style.setProperty('opacity', '1')
				setProgress(progressRef.current > 0 && progressRef.current < 1 ? progressRef.current : START_PROGRESS)
				startTrickleTimer()
				return
			}

			if (showTimerRef.current === null) {
				showTimerRef.current = window.setTimeout(showProgress, SHOW_DELAY_MS)
			}
		}

		const completeProgress = () => {
			pendingRoutesRef.current = Math.max(0, pendingRoutesRef.current - 1)
			if (pendingRoutesRef.current > 0) return

			if (!isShownRef.current) {
				clearShowTimer()
				return
			}

			clearShowTimer()
			clearTrickleTimer()
			setProgress(1)
			completeTimerRef.current = window.setTimeout(() => {
				containerRef.current?.style.setProperty('opacity', '0')
				resetTimerRef.current = window.setTimeout(() => {
					isShownRef.current = false
					setProgress(0)
				}, RESET_DELAY_MS)
			}, COMPLETE_HOLD_MS)
		}

		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		const applyMotionPreference = () => {
			reduceMotionRef.current = mediaQuery.matches
			setTransitionDuration(mediaQuery.matches ? '0ms' : '200ms')
			if (mediaQuery.matches) {
				clearTrickleTimer()
			} else if (isShownRef.current && pendingRoutesRef.current > 0) {
				startTrickleTimer()
			}
		}

		applyMotionPreference()
		mediaQuery.addEventListener('change', applyMotionPreference)
		Router.events.on('routeChangeStart', startProgress)
		Router.events.on('routeChangeComplete', completeProgress)
		Router.events.on('routeChangeError', completeProgress)

		return () => {
			mediaQuery.removeEventListener('change', applyMotionPreference)
			clearShowTimer()
			clearCompleteTimers()
			clearTrickleTimer()
			Router.events.off('routeChangeStart', startProgress)
			Router.events.off('routeChangeComplete', completeProgress)
			Router.events.off('routeChangeError', completeProgress)
		}
	}, [])

	return (
		<div
			aria-hidden="true"
			ref={containerRef}
			className="pointer-events-none fixed inset-x-0 top-0 z-[1031] h-0.5 opacity-0 transition-opacity duration-200"
		>
			<div
				ref={barRef}
				className="relative h-full w-full bg-(--link-active-bg) transition-transform duration-200 ease-out"
				style={{ transform: 'translate3d(-100%, 0, 0)' }}
			>
				<span className="absolute top-0 right-0 block h-full w-[100px] [transform:rotate(3deg)_translate(0px,-4px)] shadow-[0_0_10px_var(--link-active-bg),0_0_5px_var(--link-active-bg)]" />
			</div>
		</div>
	)
}

import { useRef, useCallback, useEffect } from 'react'

interface PullToRefreshOptions {
	onRefresh: () => Promise<void> | void
	threshold?: number
	resistance?: number
	enabled?: boolean
	refreshingIndicatorHeight?: number
}

export function usePullToRefresh({
	onRefresh,
	threshold = 80,
	resistance = 2.5,
	enabled = true,
	refreshingIndicatorHeight = 60
}: PullToRefreshOptions) {
	const elementRef = useRef<HTMLDivElement>(null)
	const startY = useRef(0)
	const currentY = useRef(0)
	const isPulling = useRef(false)
	const isRefreshing = useRef(false)
	const indicatorRef = useRef<HTMLDivElement>(null)
	
	const updateIndicator = useCallback((pullDistance: number) => {
		if (!indicatorRef.current) return
		
		const progress = Math.min(pullDistance / threshold, 1)
		const opacity = Math.min(progress, 1)
		const scale = 0.8 + (0.2 * progress)
		
		indicatorRef.current.style.opacity = opacity.toString()
		indicatorRef.current.style.transform = `translateY(${pullDistance - refreshingIndicatorHeight}px) scale(${scale})`
		
		if (pullDistance >= threshold) {
			indicatorRef.current.classList.add('ready')
		} else {
			indicatorRef.current.classList.remove('ready')
		}
	}, [threshold, refreshingIndicatorHeight])
	
	const handleTouchStart = useCallback((e: TouchEvent) => {
		if (!enabled || isRefreshing.current) return
		
		const element = elementRef.current
		if (!element) return
		
		// Only trigger if at the top of the page
		if (element.scrollTop > 0) return
		
		startY.current = e.touches[0].clientY
		isPulling.current = true
		
		// Prevent default scrolling behavior
		e.preventDefault()
	}, [enabled])
	
	const handleTouchMove = useCallback((e: TouchEvent) => {
		if (!enabled || !isPulling.current || isRefreshing.current) return
		
		const element = elementRef.current
		if (!element) return
		
		currentY.current = e.touches[0].clientY
		const pullDistance = Math.max(0, (currentY.current - startY.current) / resistance)
		
		if (pullDistance > 0) {
			updateIndicator(pullDistance)
			e.preventDefault()
		}
	}, [enabled, resistance, updateIndicator])
	
	const handleTouchEnd = useCallback(async () => {
		if (!enabled || !isPulling.current || isRefreshing.current) return
		
		const pullDistance = Math.max(0, (currentY.current - startY.current) / resistance)
		
		if (pullDistance >= threshold) {
			isRefreshing.current = true
			
			// Show refreshing state
			if (indicatorRef.current) {
				indicatorRef.current.classList.add('refreshing')
				indicatorRef.current.style.transform = `translateY(0px) scale(1)`
			}
			
			try {
				await onRefresh()
			} finally {
				isRefreshing.current = false
				
				// Hide indicator
				if (indicatorRef.current) {
					indicatorRef.current.classList.remove('refreshing', 'ready')
					indicatorRef.current.style.opacity = '0'
					indicatorRef.current.style.transform = `translateY(-${refreshingIndicatorHeight}px) scale(0.8)`
				}
			}
		} else {
			// Snap back
			if (indicatorRef.current) {
				indicatorRef.current.classList.remove('ready')
				indicatorRef.current.style.opacity = '0'
				indicatorRef.current.style.transform = `translateY(-${refreshingIndicatorHeight}px) scale(0.8)`
			}
		}
		
		isPulling.current = false
		startY.current = 0
		currentY.current = 0
	}, [enabled, threshold, resistance, onRefresh, refreshingIndicatorHeight])
	
	useEffect(() => {
		const element = elementRef.current
		if (!element || !enabled) return
		
		element.addEventListener('touchstart', handleTouchStart, { passive: false })
		element.addEventListener('touchmove', handleTouchMove, { passive: false })
		element.addEventListener('touchend', handleTouchEnd)
		
		return () => {
			element.removeEventListener('touchstart', handleTouchStart)
			element.removeEventListener('touchmove', handleTouchMove)
			element.removeEventListener('touchend', handleTouchEnd)
		}
	}, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])
	
	const RefreshIndicator = useCallback(() => (
		<div
			ref={indicatorRef}
			className="pull-to-refresh-indicator"
			style={{
				position: 'absolute',
				top: 0,
				left: '50%',
				transform: `translateX(-50%) translateY(-${refreshingIndicatorHeight}px) scale(0.8)`,
				opacity: 0,
				transition: 'opacity 0.2s ease, transform 0.2s ease',
				zIndex: 1000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: '40px',
				height: '40px',
				borderRadius: '50%',
				backgroundColor: 'var(--cards-bg)',
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				border: '1px solid var(--bg3)'
			}}
		>
			<div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
		</div>
	), [refreshingIndicatorHeight])
	
	return {
		elementRef,
		RefreshIndicator,
		isRefreshing: isRefreshing.current
	}
}
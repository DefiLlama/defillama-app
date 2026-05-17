import { useCallback, useEffect, useRef, useState } from 'react'

export type UseIntersectionObserverOptions = IntersectionObserverInit & {
	freezeOnceVisible?: boolean
}

export type UseIntersectionObserverResult = {
	ref: (node: Element | null) => void
	isIntersecting: boolean
}

export function useIntersectionObserver(options: UseIntersectionObserverOptions = {}): UseIntersectionObserverResult {
	const { freezeOnceVisible = false, threshold = 0, root = null, rootMargin } = options
	const [isIntersecting, setIsIntersecting] = useState(false)
	const frozenRef = useRef(false)
	const observerRef = useRef<IntersectionObserver | null>(null)
	const nodeRef = useRef<Element | null>(null)

	const cleanup = useCallback(() => {
		if (observerRef.current) {
			observerRef.current.disconnect()
			observerRef.current = null
		}
	}, [])

	const ref = useCallback(
		(node: Element | null) => {
			cleanup()
			nodeRef.current = node
			if (!node || (freezeOnceVisible && frozenRef.current)) {
				return
			}
			const observer = new IntersectionObserver(
				([entry]) => {
					const visible = entry?.isIntersecting ?? false
					if (freezeOnceVisible && visible) {
						frozenRef.current = true
						setIsIntersecting(true)
						observer.disconnect()
						observerRef.current = null
						return
					}
					setIsIntersecting(visible)
				},
				{ threshold, root, rootMargin }
			)
			observerRef.current = observer
			observer.observe(node)
		},
		[cleanup, freezeOnceVisible, root, rootMargin, threshold]
	)

	useEffect(() => cleanup, [cleanup])

	return { ref, isIntersecting }
}

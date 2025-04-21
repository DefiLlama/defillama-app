import { useInView, defaultFallbackInView } from 'react-intersection-observer'

defaultFallbackInView(true)

export const LazyChart = ({ children, enable = true, ...props }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return enable ? (
		<div ref={ref} {...props}>
			{inView && children}
		</div>
	) : (
		children
	)
}

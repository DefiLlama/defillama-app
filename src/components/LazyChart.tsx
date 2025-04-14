import { useInView, defaultFallbackInView } from 'react-intersection-observer'

defaultFallbackInView(true)

export const LazyChart = ({ children, enable = true, className = '', ...props }) => {
	const { ref, inView } = useInView({
		triggerOnce: true
	})

	return enable ? (
		<div
			ref={ref}
			className={`relative col-span-2 min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-2 ${className}`}
			{...props}
		>
			{inView && children}
		</div>
	) : (
		children
	)
}

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg'
	className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-5 w-5',
		md: 'h-8 w-8',
		lg: 'h-12 w-12'
	}

	return (
		<div
			className={`animate-spin rounded-full border-b-2 border-[var(--primary1)] ${sizeClasses[size]} ${className}`}
		/>
	)
}

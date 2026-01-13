import { useMemo } from 'react'

interface LogoItem {
	src: string
	alt: string
}

interface LogosCarouselProps {
	logos: LogoItem[]
	speed?: 'slow' | 'medium' | 'fast'
	logoWidth?: 'sm' | 'md' | 'lg'
	className?: string
}

export function LogosCarousel({ logos, speed = 'slow', logoWidth = 'md', className = '' }: LogosCarouselProps) {
	// Determine animation duration based on speed
	const durations = {
		slow: 50,
		medium: 35,
		fast: 25
	}
	const duration = durations[speed]

	// Logo container width classes
	const widthClasses = {
		sm: 'w-20 sm:w-24',
		md: 'w-24 sm:w-28 lg:w-32',
		lg: 'w-28 sm:w-32 lg:w-40'
	}

	// Create duplicated logos for seamless looping
	// We duplicate 3x to ensure smooth infinite scroll
	const duplicatedLogos = useMemo(() => {
		return [...logos, ...logos, ...logos]
	}, [logos])

	return (
		<div className={`relative w-full overflow-hidden ${className}`}>
			{/* Gradient fade mask on left side */}
			<div
				className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 lg:w-40 z-10 pointer-events-none"
				style={{
					background: 'linear-gradient(to right, rgba(19,20,26,1) 0%, rgba(19,20,26,0.8) 30%, transparent 100%)'
				}}
			/>

			{/* Gradient fade mask on right side */}
			<div
				className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 lg:w-40 z-10 pointer-events-none"
				style={{
					background: 'linear-gradient(to left, rgba(19,20,26,1) 0%, rgba(19,20,26,0.8) 30%, transparent 100%)'
				}}
			/>

			{/* Carousel container */}
			<div className="flex items-center justify-start py-8 sm:py-12">
				<style>{`
					@keyframes scroll-left {
						0% {
							transform: translateX(0);
						}
						100% {
							transform: translateX(calc(-${(100 / 3).toFixed(2)}% - 0px));
						}
					}

					.logos-carousel {
						animation: scroll-left ${duration}s linear infinite;
						will-change: transform;
						backface-visibility: hidden;
					}

					/* Optional: Pause on hover for better UX */
					.logos-carousel-container:hover .logos-carousel {
						animation-play-state: paused;
					}
				`}</style>

				<div className="logos-carousel-container w-full overflow-hidden">
					<div
						className="logos-carousel flex gap-8 sm:gap-10 lg:gap-12 whitespace-nowrap"
						style={{
							width: 'fit-content'
						}}
					>
						{duplicatedLogos.map((logo, index) => (
							<div
								key={`${logo.alt}-${index}`}
								className={`${widthClasses[logoWidth]} flex-shrink-0 h-16 sm:h-20 flex items-center justify-center`}
							>
								<img
									src={logo.src}
									alt={logo.alt}
									className="max-h-full max-w-full object-contain object-center opacity-70 hover:opacity-100 transition-opacity duration-300 filter grayscale hover:grayscale-0"
									loading="lazy"
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

import Image, { ImageProps } from 'next/image'
import { useEffect, useState } from 'react'

// empty pixel
const fallbackImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

export const ImageWithFallback = ({
	fallback: _fallback = fallbackImage,
	alt,
	src,
	...props
}: ImageProps & {
	fallback?: string
}) => {
	const resolvedSrc = (() => {
		if (typeof src === 'string') return src
		if ('default' in src) return src.default.src
		return src.src
	})()
	const [erroredSrc, setErroredSrc] = useState<string | null>(null)
	const shouldFallback = erroredSrc === resolvedSrc

	useEffect(() => {
		setErroredSrc(null)
	}, [resolvedSrc])

	return (
		<Image
			alt={alt}
			onError={() => setErroredSrc(resolvedSrc)}
			src={shouldFallback ? _fallback : src}
			unoptimized
			{...props}
		/>
	)
}

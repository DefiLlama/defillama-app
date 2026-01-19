import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

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
	const [erroredSrc, setErroredSrc] = useState<ImageProps['src'] | null>(null)
	const shouldFallback = Object.is(erroredSrc, src)

	return (
		<Image alt={alt} onError={() => setErroredSrc(src)} src={shouldFallback ? _fallback : src} unoptimized {...props} />
	)
}

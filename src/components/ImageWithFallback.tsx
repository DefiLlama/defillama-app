import { useEffect, useState } from 'react'
import Image, { ImageProps } from 'next/image'

// empty pixel
const fallbackImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

export const ImageWithFallback = ({
	fallback = fallbackImage,
	alt,
	src,
	...props
}: ImageProps & {
	fallback?: string
}) => {
	const [error, setError] = useState(null)

	useEffect(() => {
		setError(null)
	}, [src])

	return <Image alt={alt} onError={setError} src={error ? fallbackImage : src} unoptimized {...props} />
}

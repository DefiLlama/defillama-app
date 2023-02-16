import Image, { ImageProps } from 'next/future/image'
import { useEffect, useState } from 'react'

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

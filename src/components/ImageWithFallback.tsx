// empty pixel
const fallbackImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

export const ImageWithFallback = ({
	fallback: _fallback = fallbackImage,
	...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
	fallback?: string
}) => {
	return (
		<img
			onError={(e) => {
				e.currentTarget.src = _fallback
			}}
			{...props}
		/>
	)
}

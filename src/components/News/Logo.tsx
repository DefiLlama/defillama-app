export function DLNewsLogo({ width = 164, height = 40, ...props }) {
	return (
		<svg width={width} height={height} {...props}>
			<use href={`/dlnews.svg#dlnews-logo`} />
		</svg>
	)
}

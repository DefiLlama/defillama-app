import * as React from 'react'
interface TokenLogoProps {
	logo?: string | null
	fallbackLogo?: string | null
	size?: number
	onClick?: React.MouseEventHandler
}

export const FallbackLogo = () => (
	<span className="inline-block aspect-square h-6 w-6 shrink-0 rounded-full bg-(--bg-tertiary) object-cover" />
)

export function TokenLogo({ logo = null, size = 24, fallbackLogo, ...rest }: TokenLogoProps) {
	// Remount the inner image when the candidate sources change,
	// so the fallback state resets without needing an effect.
	const sourcesKey = `${logo ?? ''}|${fallbackLogo ?? ''}`

	return <TokenLogoImg key={sourcesKey} logo={logo} size={size} fallbackLogo={fallbackLogo} {...rest} />
}

function TokenLogoImg({ logo = null, size = 24, fallbackLogo, ...rest }: TokenLogoProps) {
	const placeholderSrc = '/assets/placeholder.png'
	const initialSrc = logo || fallbackLogo || placeholderSrc
	const [src, setSrc] = React.useState<string>(initialSrc)

	return (
		<img
			{...rest}
			alt={''}
			src={src}
			height={size}
			width={size}
			className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block"
			loading="lazy"
			onError={(e) => {
				// Use state so React doesn't re-apply the broken `logo` on re-render.
				// Try: logo -> fallbackLogo (if different) -> placeholder
				setSrc((prev) => {
					if (prev === logo && fallbackLogo && fallbackLogo !== logo) return fallbackLogo
					if (prev !== placeholderSrc) return placeholderSrc
					return prev
				})

				// If even the placeholder fails, stop trying.
				if (src === placeholderSrc) e.currentTarget.onerror = null
			}}
		/>
	)
}

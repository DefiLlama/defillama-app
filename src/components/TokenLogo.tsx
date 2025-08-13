import * as React from 'react'

interface TokenLogoProps {
	logo?: string | null
	fallbackLogo?: string | null
	size?: number
	onClick?: React.MouseEventHandler
}

export const FallbackLogo = () => (
	<span className="inline-block rounded-full object-cover aspect-square shrink-0 bg-(--bg-tertiary) h-6 w-6" />
)

export function TokenLogo({ logo = null, size = 24, fallbackLogo, ...rest }: TokenLogoProps) {
	return (
		<img
			{...rest}
			alt={''}
			src={logo || fallbackLogo}
			height={size}
			width={size}
			className="inline-block rounded-full object-cover aspect-square shrink-0 bg-(--bg-tertiary) data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block"
			loading="lazy"
			onError={(e) => {
				e.currentTarget.src = fallbackLogo || '/placeholder.png'
			}}
		/>
	)
}

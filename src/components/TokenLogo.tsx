import * as React from 'react'
import { chainIconUrl, peggedAssetIconUrl, tokenIconUrl } from '~/utils'

export type LogoKind = 'token' | 'chain' | 'pegged'

type TokenLogoProps = {
	size?: number
	alt?: string
	title?: string
	fallbackSrc?: string | null
	'data-lgonly'?: boolean
} & (
	| { name: string; kind: LogoKind; src?: never }
	| { src: string | null | undefined; name?: never; kind?: never }
)

function resolveLogoUrl(name: string, kind: LogoKind): string {
	switch (kind) {
		case 'token':
			return tokenIconUrl(name)
		case 'chain':
			return chainIconUrl(name)
		case 'pegged':
			return peggedAssetIconUrl(name)
	}
}

export const FallbackLogo = () => (
	<span className="inline-block aspect-square h-6 w-6 shrink-0 rounded-full bg-(--bg-tertiary) object-cover" />
)

export function TokenLogo(props: TokenLogoProps) {
	const { size = 24, fallbackSrc, alt, title, 'data-lgonly': lgonly, ...rest } = props
	const resolvedSrc = 'kind' in rest && rest.kind ? resolveLogoUrl(rest.name, rest.kind) : (rest.src ?? null)

	const sourcesKey = `${resolvedSrc ?? ''}|${fallbackSrc ?? ''}`

	return (
		<TokenLogoImg
			key={sourcesKey}
			resolvedSrc={resolvedSrc}
			size={size}
			fallbackSrc={fallbackSrc}
			alt={alt}
			title={title}
			data-lgonly={lgonly}
		/>
	)
}

function TokenLogoImg({
	resolvedSrc,
	size = 24,
	fallbackSrc,
	alt,
	title,
	'data-lgonly': lgonly
}: {
	resolvedSrc: string | null
	size?: number
	fallbackSrc?: string | null
	alt?: string
	title?: string
	'data-lgonly'?: boolean
}) {
	const placeholderSrc = '/assets/placeholder.png'
	const initialSrc = resolvedSrc || fallbackSrc || placeholderSrc
	const [src, setSrc] = React.useState<string>(initialSrc)

	return (
		<img
			alt={alt ?? ''}
			src={src}
			height={size}
			width={size}
			title={title}
			data-lgonly={lgonly}
			className="inline-block aspect-square shrink-0 rounded-full bg-(--bg-tertiary) object-cover data-[lgonly=true]:hidden lg:data-[lgonly=true]:inline-block"
			loading="lazy"
			onError={(e) => {
				setSrc((prev) => {
					if (prev === resolvedSrc && fallbackSrc && fallbackSrc !== resolvedSrc) return fallbackSrc
					if (prev !== placeholderSrc) return placeholderSrc
					return prev
				})

				if (src === placeholderSrc) e.currentTarget.onerror = null
			}}
		/>
	)
}

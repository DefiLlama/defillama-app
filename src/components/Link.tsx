import RouterLink from 'next/link'
import * as React from 'react'

interface BasicLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string
	prefetch?: boolean
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
	ref?: React.Ref<HTMLAnchorElement>
}

export function BasicLink({ ref, ...props }: BasicLinkProps) {
	const linkProps = { ...props, prefetch: props.prefetch ?? false }
	const RouterLinkAny = RouterLink as any
	return (
		<RouterLinkAny {...linkProps} {...(ref ? { ref } : {})}>
			{props.children}
		</RouterLinkAny>
	)
}

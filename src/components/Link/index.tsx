import * as React from 'react'
import RouterLink from 'next/link'

interface BasicLinkProps {
	href: string
	style?: React.CSSProperties
	children: React.ReactNode
	shallow?: boolean
	onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

interface CustomLinkProps extends BasicLinkProps {
	id?: string
	style?: React.CSSProperties
	target?: React.HTMLAttributeAnchorTarget
}

export const CustomLink = ({ href, children, target, ...props }: CustomLinkProps) => {
	return (
		<RouterLink href={href} passHref prefetch={false}>
			<a target={target} className="text-sm font-medium text-[var(--link-text)]" {...props}>
				{children}
			</a>
		</RouterLink>
	)
}

export const BasicLink = ({ href, children, shallow, ...props }: BasicLinkProps) => (
	<RouterLink href={href} passHref prefetch={false} shallow={shallow}>
		<a {...props}>{children}</a>
	</RouterLink>
)

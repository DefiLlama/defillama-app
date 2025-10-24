import { Bookmark } from '~/components/Bookmark'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import useWindowSize from '~/hooks/useWindowSize'
import { chainIconUrl, tokenIconUrl } from '~/utils'

interface INameYieldPoolProps {
	value: string
	configID: string
	url: string
	index: number
	borrow?: boolean
	withoutLink?: boolean
	maxCharacters?: number
	bookmark?: boolean
	strategy?: boolean
	poolMeta?: string | null
}

interface INameYield {
	project: string
	projectslug: string
	airdrop?: boolean
	borrow?: boolean
	withoutLink?: boolean
}

export function NameYieldPool({
	value,
	configID,
	url,
	index,
	borrow,
	strategy,
	withoutLink,
	maxCharacters,
	bookmark = true,
	poolMeta
}: INameYieldPoolProps) {
	const tokenUrl = strategy ? `/yields/strategy/${configID}` : `/yields/pool/${configID}`
	const windowSize = useWindowSize()
	const mc =
		maxCharacters ??
		(windowSize?.width >= 1720
			? 36
			: windowSize?.width >= 1640
				? 32
				: windowSize?.width >= 1600
					? 28
					: windowSize?.width >= 1536
						? 16
						: windowSize?.width >= 1280
							? 12
							: 10)

	return (
		<span className="flex items-center gap-2">
			{bookmark ? <Bookmark readableName={value} configID={configID} data-lgonly /> : null}

			<span className="shrink-0">{index}</span>

			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="hidden shrink-0 items-center justify-center rounded-md bg-(--link-button) p-1.5 hover:bg-(--link-button-hover) lg:flex"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>

			<LinkWrapper
				url={withoutLink ? null : tokenUrl}
				showTooltip={value.length + (poolMeta ? poolMeta.length : 0) >= mc}
			>
				{poolMeta ? (
					<>
						<span className="shrink-0 overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text)">
							{value}
						</span>
						<span className="ml-1 flex-shrink-1 overflow-hidden rounded-lg bg-(--bg-tertiary) px-1 py-0.5 text-xs text-ellipsis whitespace-nowrap text-black group-data-[tooltipcontent=true]:whitespace-break-spaces dark:text-white">
							{poolMeta}
						</span>
					</>
				) : (
					<>{value}</>
				)}
			</LinkWrapper>
		</span>
	)
}

const LinkWrapper = ({ url, children, showTooltip }) => {
	if (showTooltip) {
		return (
			<>
				{url ? (
					<Tooltip
						render={<a href={url} target="_blank" rel="noopener noreferrer" />}
						className="flex shrink! items-center overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
						content={children}
						data-fullwidth
					>
						{children}
					</Tooltip>
				) : (
					<Tooltip
						className="flex shrink! items-center overflow-hidden font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
						content={children}
						data-fullwidth
					>
						{children}
					</Tooltip>
				)}
			</>
		)
	}

	return (
		<>
			{url ? (
				<BasicLink
					href={url}
					target="_blank"
					className="flex items-center overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
				>
					{children}
				</BasicLink>
			) : (
				<span className="flex items-center overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
			)}
		</>
	)
}

export function NameYield({ project, projectslug, airdrop, borrow, withoutLink, ...props }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="relative flex items-center pl-6" {...props}>
			{airdrop && project !== 'Fraxlend' ? (
				<Tooltip
					content="This project has no token and might airdrop one to depositors in the future"
					className="m-[0_16px_0_-32px]"
				>
					🪂
				</Tooltip>
			) : null}
			<TokenLogo logo={iconUrl} />
			{withoutLink ? (
				<FormattedName text={project} maxCharacters={20} link fontWeight={500} />
			) : (
				<BasicLink
					href={tokenUrl}
					className="ml-2 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
				>
					{project}
				</BasicLink>
			)}
		</span>
	)
}

//
export function YieldsProject({ project, projectslug }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="flex items-center gap-2">
			<TokenLogo logo={iconUrl} />
			<BasicLink
				href={tokenUrl}
				className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
			>
				{project}
			</BasicLink>
		</span>
	)
}

export function PoolStrategyRoute({ project1, airdropProject1, project2, airdropProject2, chain, index }) {
	const iconUrl1 = tokenIconUrl(project1)
	const iconUrl2 = tokenIconUrl(project2)
	const chainIcon = chainIconUrl(chain)

	return (
		<span className="flex items-center gap-1">
			<span className="shrink-0 opacity-0">{index}</span>
			<TokenLogo logo={chainIcon} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				{airdropProject1 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}
				<TokenLogo logo={iconUrl1} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project1}</span>
			</span>
			<span className="shrink-0">{'->'}</span>
			<span className="flex items-center gap-1">
				{airdropProject2 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}
				<TokenLogo logo={iconUrl2} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project2}</span>
			</span>
		</span>
	)
}

export function FRStrategyRoute({ project1, airdropProject1, project2, airdropProject2, chain, index }) {
	const iconUrl1 = tokenIconUrl(project1)
	const iconUrl2 = tokenIconUrl(project2)
	const chainIcon = chainIconUrl(chain)

	return (
		<span className="ml-1 flex items-center gap-1">
			<span className="shrink-0 opacity-0">{index}</span>
			<TokenLogo logo={chainIcon} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				{airdropProject1 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}
				<TokenLogo logo={iconUrl1} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project1}</span>
			</span>
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo logo={iconUrl2} />
				<span className="overflow-hidden text-ellipsis whitespace-nowrap">{project2}</span>
			</span>
		</span>
	)
}

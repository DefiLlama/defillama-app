import { Bookmark } from '~/components/Bookmark'
import { CustomLink } from '~/components/Link'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { FormattedName } from '~/components/FormattedName'
import useWindowSize from '~/hooks/useWindowSize'
import { Icon } from '~/components/Icon'
import { ButtonLight } from '~/components/ButtonStyled'

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
	bookmark = true
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
			{bookmark ? <Bookmark readableProtocolName={configID} data-lgonly /> : null}

			<span className="flex-shrink-0">{index}</span>

			{url ? (
				<ButtonLight
					className="hidden lg:flex items-center justify-center gap-4 !p-[6px] flex-shrink-0"
					as="a"
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					useTextColor={true}
				>
					<Icon name="arrow-up-right" height={14} width={14} />
				</ButtonLight>
			) : (
				''
			)}

			{withoutLink ? (
				<FormattedName text={value} maxCharacters={mc} link fontWeight={500} />
			) : (
				<CustomLink href={tokenUrl} target="_blank" className="overflow-hidden whitespace-nowrap text-ellipsis">
					<FormattedName text={value} maxCharacters={mc} link fontWeight={500} />
				</CustomLink>
			)}
		</span>
	)
}

export function NameYield({ project, projectslug, airdrop, borrow, withoutLink, ...props }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="flex items-center relative pl-6" {...props}>
			{airdrop && project !== 'Fraxlend' ? (
				<Tooltip
					content="This project has no token and might airdrop one to depositors in the future"
					anchorStyles={{ margin: '0 16px 0 -32px' }}
				>
					🪂
				</Tooltip>
			) : null}
			<TokenLogo logo={iconUrl} />
			{withoutLink ? (
				<FormattedName text={project} maxCharacters={20} link fontWeight={500} />
			) : (
				<CustomLink href={tokenUrl} className="overflow-hidden whitespace-nowrap text-ellipsis ml-2">
					{project}
				</CustomLink>
			)}
		</span>
	)
}

export function YieldsProject({ project, projectslug }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<span className="flex items-center gap-2">
			<TokenLogo logo={iconUrl} />
			<CustomLink href={tokenUrl} className="overflow-hidden whitespace-nowrap text-ellipsis">
				{project}
			</CustomLink>
		</span>
	)
}

export function PoolStrategyRoute({ project1, airdropProject1, project2, airdropProject2, chain, index }) {
	const iconUrl1 = tokenIconUrl(project1)
	const iconUrl2 = tokenIconUrl(project2)
	const chainIcon = chainIconUrl(chain)

	return (
		<span className="flex items-center gap-2">
			<span className="opacity-0 flex-shrink-0">{index}</span>
			<TokenLogo logo={chainIcon} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				{airdropProject1 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}
				<TokenLogo logo={iconUrl1} />
				<span className="overflow-hidden whitespace-nowrap text-ellipsis">{project1}</span>
			</span>
			<span>{'->'}</span>
			<span className="flex items-center gap-1">
				{airdropProject2 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}

				<TokenLogo logo={iconUrl2} />
				<span className="overflow-hidden whitespace-nowrap text-ellipsis">{project2}</span>
			</span>
		</span>
	)
}

export function FRStrategyRoute({ project1, airdropProject1, project2, airdropProject2, chain, index }) {
	const iconUrl1 = tokenIconUrl(project1)
	const iconUrl2 = tokenIconUrl(project2)
	const chainIcon = chainIconUrl(chain)

	return (
		<span className="flex items-center gap-2">
			<span className="opacity-0 flex-shrink-0">{index}</span>
			<TokenLogo logo={chainIcon} />
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				{airdropProject1 ? (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">🪂</Tooltip>
				) : null}
				<TokenLogo logo={iconUrl1} />
				<span className="overflow-hidden whitespace-nowrap text-ellipsis">{project1}</span>
			</span>
			<span>{'|'}</span>
			<span className="flex items-center gap-1">
				<TokenLogo logo={iconUrl2} />
				<span className="overflow-hidden whitespace-nowrap text-ellipsis">{project2}</span>
			</span>
		</span>
	)
}

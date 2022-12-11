import styled from 'styled-components'
import { ArrowUpRight } from 'react-feather'
import { ButtonYields } from '~/layout/Pool'
import Bookmark from '~/components/Bookmark'
import { CustomLink } from '~/components/Link'
import TokenLogo from '~/components/TokenLogo'
import { chainIconUrl, tokenIconUrl } from '~/utils'
import Tooltip from '~/components/Tooltip'
import FormattedName from '~/components/FormattedName'

interface INameYieldPoolProps {
	value: string
	configID: string
	url: string
	index: number
	borrow?: boolean
	withoutLink?: boolean
	maxCharacters?: number
	bookmark?: boolean
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
	withoutLink,
	maxCharacters = 10,
	bookmark = true
}: INameYieldPoolProps) {
	const tokenUrl = borrow ? `/yields/borrow/${configID}` : `/yields/pool/${configID}`

	return (
		<Wrapper>
			{bookmark ? <Bookmark readableProtocolName={configID} data-lgonly /> : null}

			<span>{index}</span>

			{url ? (
				<ButtonYields as="a" href={url} target="_blank" rel="noopener noreferrer" data-lgonly useTextColor={true}>
					<ArrowUpRight size={14} />
				</ButtonYields>
			) : (
				''
			)}

			{withoutLink ? (
				<FormattedName text={value} maxCharacters={maxCharacters} link fontWeight={500} />
			) : (
				<CustomLink href={tokenUrl} target="_blank">
					<FormattedName text={value} maxCharacters={maxCharacters} link fontWeight={500} />
				</CustomLink>
			)}
		</Wrapper>
	)
}

export function NameYield({ project, projectslug, airdrop, borrow, withoutLink, ...props }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = borrow ? `/yields/borrow?project=${projectslug}` : `/yields?project=${projectslug}`

	return (
		<AirdropWrapper {...props}>
			{airdrop && project !== 'Fraxlend' && (
				<Tooltip content="This project has no token and might airdrop one to depositors in the future">
					<Airdrop>🪂</Airdrop>
				</Tooltip>
			)}
			<TokenLogo logo={iconUrl} />
			{withoutLink ? (
				<FormattedName text={project} maxCharacters={20} link fontWeight={500} margin />
			) : (
				<CustomLink href={tokenUrl}>{project}</CustomLink>
			)}
		</AirdropWrapper>
	)
}

export function YieldsProject({ project, projectslug }: INameYield) {
	const iconUrl = tokenIconUrl(project)
	const tokenUrl = `/yields?project=${projectslug}`

	return (
		<Wrapper>
			<TokenLogo logo={iconUrl} />
			<CustomLink href={tokenUrl}>{project}</CustomLink>
		</Wrapper>
	)
}

export function PoolStrategyRoute({ project1, airdropProject1, project2, airdropProject2, chain, index }) {
	const iconUrl1 = tokenIconUrl(project1)
	const iconUrl2 = tokenIconUrl(project2)
	const chainIcon = chainIconUrl(chain)

	return (
		<Wrapper>
			<HideIndex>{index}</HideIndex>
			<TokenLogo logo={chainIcon} />
			<span>{'|'}</span>
			<ProjectWrapper>
				{airdropProject1 && (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">
						<span>🪂</span>
					</Tooltip>
				)}
				<TokenLogo logo={iconUrl1} />
				<span>{project1}</span>
			</ProjectWrapper>
			<span>{'->'}</span>
			<ProjectWrapper>
				{airdropProject2 && (
					<Tooltip content="This project has no token and might airdrop one to depositors in the future">
						<span>🪂</span>
					</Tooltip>
				)}

				<TokenLogo logo={iconUrl2} />
				<span>{project2}</span>
			</ProjectWrapper>
		</Wrapper>
	)
}

const Wrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 8px;

	& > *[data-lgonly] {
		display: none;
	}

	& > * {
		flex-shrink: 0;
	}

	a:last-of-type {
		flex-shrink: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpMed}) {
		& > *[data-lgonly] {
			display: flex;
		}
	}
`

const AirdropWrapper = styled(Wrapper)`
	gap: 0px;
	position: relative;
	padding-left: 32px;

	a:last-of-type {
		margin-left: 8px;
	}
`

const Airdrop = styled.span`
	width: 24px;
	margin-left: -32px;
`

const ProjectWrapper = styled.span`
	display: flex;
	align-items: center;
	gap: 6px;
	flex-shrink: 1;

	& > * {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`

const HideIndex = styled.span`
	visibility: hidden;
	padding-right: 4px;
`

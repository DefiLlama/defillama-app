import * as React from 'react'
import Link from 'next/link'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { SEO } from '~/components/SEO'
import { slug, tokenIconUrl } from '~/utils'
import { Treasury } from './Treasury'
import { ProtocolFeesRevenueVolumeCharts } from './Fees'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { ButtonLight } from '~/components/ButtonStyled'

export function DummyProtocol({ data, title, backgroundColor, protocol }) {
	const router = useRouter()

	return (
		<Layout title={title} backgroundColor={transparentize(0.6, backgroundColor)} className="gap-9">
			<SEO cardName={data.name} token={data.name} logo={tokenIconUrl(data.name)} />

			<ProtocolsChainsSearch />

			<div className="flex flex-col gap-9 p-6 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--cards-bg)] rounded-md">
				{data?.otherProtocols?.length > 1 && (
					<nav
						className="flex overflow-x-auto rounded-xl bg-[var(--bg7)] w-full max-w-fit"
						style={{ '--active-bg': transparentize(0.9, backgroundColor) } as any}
					>
						{data.otherProtocols.map((p) => (
							<Link href={`/protocol/${slug(p)}`} key={p} passHref>
								<a
									data-active={router.asPath.split('#')[0].split('?')[0] === `/protocol/${slug(p)}`}
									className="flex-shrink-0 py-2 px-6 whitespace-nowrap first:rounded-l-xl last:rounded-r-xl data-[active=true]:bg-[var(--active-bg)] hover:bg-[var(--active-bg)] focus-visible:bg-[var(--active-bg)] border-l border-[#E6E6E6] dark:border-[#39393E] first:border-l-0"
								>
									{p}
								</a>
							</Link>
						))}
					</nav>
				)}

				<h1 className="flex items-center gap-2 text-xl font-semibold">
					<TokenLogo logo={data.logo} size={24} />
					<FormattedName text={data.name} maxCharacters={16} fontWeight={700} />
				</h1>

				{data.description && <p>{data.description}</p>}

				<div className=" flex items-center flex-wrap gap-4">
					{data.url && (
						<Link href={data.url} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}

					{data.twitter && (
						<Link href={`https://twitter.com/${data.twitter}`} passHref>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}

					{data.treasury && (
						<Link
							href={`https://github.com/DefiLlama/DefiLlama-Adapters/tree/main/projects/treasury/${data.treasury}`}
							passHref
						>
							<ButtonLight as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
								<span>Methodology</span>
								<Icon name="arrow-up-right" height={14} width={14} />
							</ButtonLight>
						</Link>
					)}
				</div>

				{data.treasury && <Treasury protocolName={protocol} />}

				<ProtocolFeesRevenueVolumeCharts data={data} />
			</div>
		</Layout>
	)
}

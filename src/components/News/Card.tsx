import dayjs from 'dayjs'
import { transparentize } from 'polished'
import { IArticle } from '~/api/categories/news'
import { Icon } from '~/components/Icon'

interface INewsCardProps extends IArticle {
	color: string
}

export const NewsCard = ({ imgSrc, href, headline, date, color }: INewsCardProps) => {
	return (
		<a
			style={
				{
					'--bg-light': transparentize(0.9, color ?? '#445ed0'),
					'--bg-dark': transparentize(0.9, color ?? '#2172E5'),
					'--bg-active-light': transparentize(0.8, color ?? '#2172E5'),
					'--bg-active-dark': transparentize(0.8, color ?? '#2172E5'),
					'--text-light': '#1F1F1F',
					'--text-dark': '#FAFAFA'
				} as any
			}
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			className="p-2 flex flex-col gap-3 sm:flex-row rounded-xl text-[var(--text-white)] dark:text-[var(--text-dark)] hover:text-[var(--text-white)] hover:dark:text-[var(--text-dark)] focus-visible:text-[var(--text-white)] focus-visible:dark:text-[var(--text-dark)] bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] whitespace-nowrap hover:bg-[var(--bg-active-light)] dark:hover:bg-[var(--bg-active-dark)] focus-visible:bg-[var(--bg-active-light)] dark:focus-visible:bg-[var(--bg-active-dark)]"
		>
			{imgSrc ? (
				<img className="object-cover rounded h-[100px] sm:w-[200px] flex-shrink-0" src={imgSrc} alt={headline} />
			) : null}
			<div className="flex flex-col gap-3 justify-between">
				<p className="text-sm font-medium whitespace-pre-wrap break-keep">{headline}</p>
				<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
					<p className="text-xs text-[var(--text1)]">{dayjs(date).format('MMMM D, YYYY')}</p>
					<p className="flex items-center justify-between flex-nowrap py-2 px-3 text-sm font-semibold rounded-xl text-[var(--text-white)] dark:text-[var(--text-dark)] hover:text-[var(--text-white)] hover:dark:text-[var(--text-dark)] focus-visible:text-[var(--text-white)] focus-visible:dark:text-[var(--text-dark)] bg-[var(--bg-light)] dark:bg-[var(--bg-dark)] whitespace-nowrap hover:bg-[var(--bg-active-light)] dark:hover:bg-[var(--bg-active-dark)] focus-visible:bg-[var(--bg-active-light)] dark:focus-visible:bg-[var(--bg-active-dark)]">
						<span>Read on DL News</span> <Icon name="arrow-up-right" height={14} width={14} />
					</p>
				</div>
			</div>
		</a>
	)
}

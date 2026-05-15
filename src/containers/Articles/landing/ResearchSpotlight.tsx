import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'
import { InViewAnalytics, pushResearchAnalyticsEvent } from '~/containers/Articles/landing/Analytics'
import { TitleLine } from '~/containers/Articles/landing/TitleLine'
import { articleHref, formatDate } from '~/containers/Articles/landing/utils'
import type { LightweightArticleDocument } from '~/containers/Articles/types'

const SpotlightIcon = ({ fill }: { fill: string }) => (
	<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
		<path
			d="M22.3818 32C21.8034 30.5297 21.2508 29.1451 20.7127 27.7536C20.2372 26.5225 19.6692 25.3445 18.8689 24.2849C17.8177 22.8925 16.452 21.9015 14.9149 21.1136C14.2552 20.7758 13.6143 20.3986 12.9674 20.035C12.9143 20.005 12.8732 19.9545 12.7986 19.8859C13.2142 19.6501 13.6177 19.4306 14.0135 19.1966C14.9612 18.6393 15.9242 18.1043 16.8461 17.5068C17.5692 17.0387 18.145 16.3948 18.6959 15.7312C19.7926 14.4075 20.412 12.8386 21.022 11.2611C21.4573 10.138 21.9045 9.01744 22.3543 7.87462C22.3972 7.91405 22.4469 7.93892 22.4631 7.97835C22.8256 8.89141 23.1828 9.80447 23.5401 10.7193C23.852 11.5183 24.1262 12.3328 24.48 13.1121C25.1209 14.5241 25.9622 15.8041 27.1146 16.8638C27.9517 17.6337 28.9327 18.1823 29.918 18.7276C30.5992 19.104 31.276 19.4889 32 19.8953C31.7558 20.0368 31.5442 20.1619 31.3317 20.2828C30.3833 20.8221 29.4185 21.3331 28.4898 21.9015C26.885 22.8848 25.7018 24.272 24.8613 25.9404C24.4483 26.7591 24.1244 27.6225 23.774 28.4729C23.4416 29.2823 23.1272 30.0984 22.805 30.912C22.7005 31.1778 22.5994 31.4445 22.4966 31.7111C22.47 31.7822 22.4409 31.8525 22.3818 31.9974V32ZM0 8.58192C0.675145 8.19269 1.31945 7.84204 1.94233 7.45709C2.89421 6.86811 3.69017 6.10165 4.38245 5.22288C4.95649 4.49672 5.41059 3.70025 5.79528 2.86521C6.05232 2.30623 6.26052 1.72496 6.48756 1.15226C6.63836 0.772458 6.78401 0.390944 6.99821 0C7.11302 0.28292 7.22611 0.567555 7.34349 0.851333C7.70163 1.70867 8.02378 2.58315 8.42818 3.41905C9.19951 5.03348 10.397 6.40635 11.8913 7.38936C12.5082 7.79831 13.1756 8.13096 13.8191 8.49876C13.8576 8.52019 13.8919 8.54505 13.9707 8.59478C13.7377 8.72938 13.5355 8.85283 13.3264 8.96515C12.2357 9.54899 11.193 10.1946 10.3208 11.0939C9.43804 11.9976 8.7242 13.0522 8.21313 14.2077C7.82329 15.0891 7.48829 15.9961 7.12758 16.8912C7.08817 16.9864 7.03762 17.0781 6.96479 17.2307C6.80629 16.8475 6.67349 16.5217 6.53811 16.1976C6.16027 15.3017 5.83898 14.3758 5.38917 13.5176C4.53153 11.8818 3.32603 10.5401 1.71871 9.59271C1.2192 9.29865 0.70856 9.02173 0.203914 8.73452C0.14394 8.70109 0.0925326 8.65136 0.000856783 8.58277L0 8.58192Z"
			fill={fill}
		/>
	</svg>
)

const SpotlightBadge = (props: { className?: string }) => (
	<svg width={43} height={35} fill="none" xmlns="http://www.w3.org/2000/svg" {...props} aria-hidden>
		<rect width="42.705" height="34.69" rx={6} fill="#237BFF" />
		<path
			d="M25.877 28.691c-.41-1.042-.802-2.024-1.183-3.01-.338-.873-.74-1.709-1.309-2.46-.746-.987-1.715-1.69-2.805-2.248-.469-.24-.923-.508-1.382-.765-.037-.022-.066-.057-.12-.106.295-.167.582-.323.862-.489.673-.395 1.356-.774 2.01-1.198.513-.332.922-.788 1.312-1.259.779-.938 1.218-2.05 1.65-3.169.31-.797.627-1.591.946-2.401.03.027.066.045.077.073.257.648.51 1.295.765 1.944.22.566.415 1.144.666 1.696.455 1.001 1.052 1.91 1.87 2.66.593.546 1.29.935 1.989 1.322.483.267.963.54 1.477.828-.174.1-.323.189-.475.275-.672.382-1.357.744-2.016 1.148-1.138.696-1.978 1.68-2.574 2.863-.293.58-.523 1.193-.771 1.796-.237.574-.46 1.152-.688 1.73-.074.187-.146.377-.219.566-.019.05-.04.1-.082.203v.001ZM10 12.085c.48-.276.936-.525 1.378-.797.675-.418 1.24-.962 1.732-1.585a8.23 8.23 0 0 0 1.002-1.672c.182-.396.33-.808.49-1.214.108-.27.211-.54.363-.817.082.201.162.403.245.604.254.607.483 1.228.77 1.82a6.963 6.963 0 0 0 2.457 2.816c.438.29.91.525 1.368.786.027.015.051.033.107.068-.165.095-.309.183-.457.263-.773.414-1.513.872-2.132 1.51a7.5 7.5 0 0 0-1.496 2.207c-.277.625-.514 1.268-.77 1.902-.028.068-.064.133-.116.242-.112-.273-.206-.503-.302-.733-.268-.635-.496-1.292-.816-1.9-.608-1.16-1.463-2.112-2.603-2.784-.355-.208-.717-.405-1.076-.608-.042-.024-.078-.059-.143-.107L10 12.085Z"
			fill="#FFFFFF"
		/>
	</svg>
)

function getImageAspectRatio(itemsCount: number) {
	if (itemsCount === 6) return 'aspect-[167/96]'
	if (itemsCount === 5) return 'aspect-[207/118]'
	return 'aspect-[270/155]'
}

function getSpotlightGridCols(itemsCount: number) {
	if (itemsCount === 6) return 'sm:grid-cols-6'
	if (itemsCount === 5) return 'sm:grid-cols-5'
	return 'sm:grid-cols-4'
}

function SnapshotImage({ article }: Readonly<{ article: LightweightArticleDocument }>) {
	const url = article.coverImage?.url
	if (!url) return null
	return <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
}

interface ResearchSpotlightProps {
	articles: LightweightArticleDocument[]
	title: string
}

export const ResearchSpotlight: React.FC<ResearchSpotlightProps> = ({ title, articles }) => {
	if (articles.length === 0) return null

	const count = articles.length

	return (
		<div id="spotlight">
			<div className="mb-[26px] flex items-center gap-x-[15px]">
				<SpotlightIcon fill="currentColor" />
				<TitleLine title={title} />
			</div>
			<div className={clsx('grid grid-cols-1 gap-[12px] lg:gap-[28px]', getSpotlightGridCols(count))}>
				{articles.map((article, i) => (
					<Link
						key={article.id}
						className="group relative top-0 transition-all duration-200 ease-out hover:top-[-4px]"
						href={articleHref(article)}
						onClick={() => pushResearchAnalyticsEvent(article, 'widget_click', 'DefiLlama Research Spotlight widget')}
					>
						<div
							className={clsx(
								'relative overflow-hidden rounded-[7.2px] group-hover:brightness-[0.8] lg:min-w-[40%]',
								getImageAspectRatio(count)
							)}
						>
							<SpotlightBadge className="absolute top-[8px] left-[8px] z-[1]" />
							<SnapshotImage article={article} />
						</div>
						{i === 0 && (
							<InViewAnalytics eventParams={[article, 'widget_impression', 'DefiLlama Research Spotlight widget']} />
						)}
						<div className="flex grow flex-col py-[16px]">
							<div
								className={clsx(
									'font-semibold text-[#0d1e3b] group-hover:text-[#0c2956] group-hover:opacity-70 dark:text-white dark:group-hover:text-white/70',
									count === 5 || count === 6
										? 'line-clamp-4 text-[16px] leading-[120%]'
										: 'line-clamp-3 text-[16px] leading-[150%] lg:text-[18px]'
								)}
							>
								{article.title}
							</div>
							<time className="mt-[10px] hidden text-[14px] font-medium text-[#787878] lg:block dark:text-white">
								{formatDate(article.publishedAt)}
							</time>
						</div>
					</Link>
				))}
			</div>
		</div>
	)
}

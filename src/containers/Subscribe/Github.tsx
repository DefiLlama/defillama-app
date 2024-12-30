import { Tooltip, TooltipAnchor, useTooltipState } from 'ariakit'
import { IGithubAuthData, useGetCreditsUsage, useGithubAuth } from './queries'
import { Icon } from '~/components/Icon'
import { GH_CLIENT_ID } from '../ProApi/lib/constants'

export const SignInWithGithub = () => {
	const { isLoading, error } = useGithubAuth()

	if (isLoading) {
		return (
			<button
				className="relative flex items-center justify-center flex-nowrap gap-2 font-medium rounded-lg border border-[#39393E] py-[14px] w-full text-center mx-auto mt-14 bg-black disabled:cursor-not-allowed"
				disabled
			>
				<Icon name="github" height={16} width={16} />
				<span>Signing in...</span>
			</button>
		)
	}

	return (
		<>
			<a
				href={`https://github.com/login/oauth/authorize?client_id=${GH_CLIENT_ID}`}
				className="relative flex items-center justify-center flex-nowrap gap-2 font-medium rounded-lg border border-[#39393E] py-[14px] w-full text-center mx-auto mt-14 bg-black disabled:cursor-not-allowed"
			>
				<Icon name="github" height={16} width={16} />
				<span>Sign in with GitHub</span>
			</a>
			{error ? <p className="text-xs text-center text-red-500 -mb-4">{error.message}</p> : null}
		</>
	)
}

export const GithubApiKey = ({ data }: { data: IGithubAuthData }) => {
	const { data: creditUsage } = useGetCreditsUsage({ apiKey: data.apiKey })
	const tooltip = useTooltipState({ timeout: 0 })

	if (data?.login && !data?.isContributor) {
		return (
			<>
				<button
					onClick={() => {
						localStorage.removeItem('gh_authtoken')
						window.dispatchEvent(new Event('storage'))
					}}
					className="flex items-center justify-center flex-nowrap gap-2 font-medium rounded-lg border border-[#39393E] py-[14px] w-full max-w-[200px] text-center mx-auto bg-black disabled:cursor-not-allowed"
				>
					Log Out ({data.login})<Icon name="github" height={16} width={16} />
				</button>
				<p className="text-sm text-center text-[var(--text2)]">
					You are not a contributor. You need to contribute to the DefiLlama project to get free access to the premium
					API.
				</p>
			</>
		)
	}

	return (
		<>
			<div className="flex flex-col overflow-x-auto mb-9">
				<table className="border-collapse mx-auto">
					<tbody>
						<tr>
							<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap">API Key</th>
							<td className="p-2 border border-[#39393E]">{data.apiKey}</td>
						</tr>
						<tr>
							<th className="p-2 border border-[#39393E] font-normal whitespace-nowrap min-w-[88px]">
								<TooltipAnchor state={tooltip} className="flex flex-nowrap items-center justify-center gap-1">
									<span className="whitespace-nowrap">Calls Left</span>{' '}
									<Icon name="circle-help" height={16} width={16} />
								</TooltipAnchor>
								<Tooltip
									state={tooltip}
									className="bg-black border border-[#39393E] rounded-2xl relative z-10 p-4 max-w-sm text-sm"
								>
									Amount of calls that you can make before this api key runs out of credits. This limit will be reset at
									the end of each natural month.
								</Tooltip>
							</th>
							<td className="p-2 border border-[#39393E]">{creditUsage?.creditsLeft}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<button
				onClick={() => {
					localStorage.removeItem('gh_authtoken')
					window.dispatchEvent(new Event('storage'))
				}}
				className="flex items-center justify-center flex-nowrap gap-2 font-medium rounded-lg border border-[#39393E] py-[14px] w-full max-w-[200px] text-center mx-auto bg-black disabled:cursor-not-allowed"
			>
				Log Out ({data.login})<Icon name="github" height={16} width={16} />
			</button>
			<p className="text-sm text-center text-[var(--text2)]">You have free access to the premium API.</p>
		</>
	)
}

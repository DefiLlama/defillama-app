import { useRouter } from 'next/router'
import styled from 'styled-components'

import { GH_CLIENT_ID } from './lib/constants'
import useGithubAuth from './queries/useGithubAuth'
import { Icon } from '~/components/Icon'

const Description = styled.p`
	margin-top: 10px;
	color: ${({ theme }) => theme.text2};
	font-size: 14px;
	text-align: center;
`

const SignInWithGithub = () => {
	const { data: auth } = useGithubAuth()
	const router = useRouter()

	if (auth?.login && !auth?.isContributor) {
		return (
			<div>
				<button
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
					className="shadow p-3 rounded-lg h-9 text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]"
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</button>
				<Description>
					You are not a contributor. You need to contribute to the DefiLlama project to get free access to the premium
					API.
				</Description>
			</div>
		)
	}
	if (auth?.login && auth?.isContributor) {
		return (
			<div>
				<button
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
					className="shadow p-3 rounded-lg h-9 text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]"
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</button>
				<Description>You have free access to the premium API.</Description>
			</div>
		)
	}
	return (
		<div>
			<a href={`https://github.com/login/oauth/authorize?client_id=${GH_CLIENT_ID}`}>
				<button className="shadow p-3 rounded-lg h-9 text-base w-full flex items-center justify-center gap-2 text-white bg-[#141618]">
					Sign in with GitHub <Icon name="github" height={24} width={24} />
				</button>
			</a>
			<Description>DefiLlama contributors will have free 3 month access to premium API.</Description>
		</div>
	)
}

export default SignInWithGithub

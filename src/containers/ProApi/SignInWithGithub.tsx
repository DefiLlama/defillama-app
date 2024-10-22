import { useRouter } from 'next/router'
import styled from 'styled-components'

import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'
import { GH_CLIENT_ID } from './lib/constants'
import useGithubAuth from './queries/useGithubAuth'
import { Icon } from '~/components/Icon'

const GithubButton = styled(ButtonComponent)`
	font-size: 16px;
	height: 36px;
	width: 100%;
	display: flex;
	gap: 8px;
	background-color: #141618;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
`
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
				<GithubButton
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</GithubButton>
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
				<GithubButton
					onClick={() => {
						localStorage.removeItem('gh_authToken')
						router.reload()
					}}
				>
					Log Out ({auth.login}) <Icon name="github" height={24} width={24} />
				</GithubButton>
				<Description>You have free access to the premium API.</Description>
			</div>
		)
	}
	return (
		<div>
			<a href={`https://github.com/login/oauth/authorize?client_id=${GH_CLIENT_ID}`}>
				<GithubButton>
					Sign in with GitHub <Icon name="github" height={24} width={24} />
				</GithubButton>
			</a>
			<Description>DefiLlama contributors will have free 3 month access to premium API.</Description>
		</div>
	)
}

export default SignInWithGithub

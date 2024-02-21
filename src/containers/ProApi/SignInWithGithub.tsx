import { useRouter } from 'next/router'
import { GitHub } from 'react-feather'
import styled from 'styled-components'

import { Button as ButtonComponent } from '~/components/Nav/Mobile/shared'
import useGithubAuth from './queries/useGithubAuth'

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
					Log Out ({auth.login}) <GitHub />
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
					Log Out ({auth.login}) <GitHub />
				</GithubButton>
				<Description>You have free access to the premium API.</Description>
			</div>
		)
	}
	return (
		<div>
			<a href={`https://github.com/login/oauth/authorize?client_id=434392c1d50567bcc6a9`}>
				<GithubButton>
					Sign in with GitHub <GitHub />
				</GithubButton>
			</a>
			<Description>DefiLlama contributors will have free 3 month access to premium API.</Description>
		</div>
	)
}

export default SignInWithGithub

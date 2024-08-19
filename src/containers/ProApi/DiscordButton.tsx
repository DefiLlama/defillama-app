import React from 'react'
import styled from 'styled-components'
import discordLogo from '~/assets/discord-mark-white.png'
import useDiscordOAuth from './queries/useDiscordAuth'

const DiscordButton = () => {
	const { isLoading, isError } = useDiscordOAuth()

	const handleClick = () => {
		const discordOAuthUrl =
			'https://discord.com/oauth2/authorize?client_id=1233371206346866719&response_type=code&redirect_uri=https://defillama.com/pro-api&scope=identify+guilds.join'
		window.open(discordOAuthUrl, '_blank')
	}

	return (
		<StyledButton onClick={handleClick}>
			Join Discord
			<DiscordLogo src={discordLogo.src} alt="Discord Logo" />
		</StyledButton>
	)
}

const StyledButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #2172e5;
	color: #fff;
	height: 32px;
	font-size: 0.825rem;
	font-weight: bold;
	padding: 10px 20px;
	border: none;
	border-radius: 12px;
	cursor: pointer;

	&:hover {
		background-color: #677bc4;
	}

	&:disabled {
		background-color: #a9a9a9;
		cursor: not-allowed;
	}
`

const DiscordLogo = styled.img`
	height: 20px;
	margin-left: 10px;
`

export default DiscordButton

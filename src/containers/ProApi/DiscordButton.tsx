import React from 'react'
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
		<button
			onClick={handleClick}
			className="flex items-center gap-2 bg-[#2172e5] text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#677bc4] disabled:bg-[#a9a9a9]"
		>
			<span>Join Discord</span>
			<img src={discordLogo.src} alt="Discord Logo" height={20} />
		</button>
	)
}

export default DiscordButton

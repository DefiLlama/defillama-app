import { NextApiRequest, NextApiResponse } from 'next'

export default async function roundupMarkdown(req: NextApiRequest, res: NextApiResponse) {
	try {
		const headers = new Headers()
		headers.append('Authorization', `Bot ${process.env.ROUND_UP_BOT_TOKEN}`)

		const data = await fetch('https://discordapp.com/api/channels/965023197365960734/messages', {
			method: 'GET',
			headers: headers,
			redirect: 'follow'
		}).then((res) => res.json())

		const index = data.findIndex((d) => d.content.startsWith('Daily news round-up with the')) ?? null

		const raw = Number.isNaN(index) ? [] : data.slice(0, index + 1)

		const messages = raw
			.reverse()
			.map((m) => m.content)
			.join('')

		return res.json(messages)
	} catch (error) {}
}

const axios = require('axios')

// convert the bash script above to JS
const BUILD_STATUS_LLAMAS = process.env.BUILD_STATUS_LLAMAS
const BUILD_STATUS_DASHBOARD = process.env.BUILD_STATUS_DASHBOARD
const BUILD_STATUS_WEBHOOK = process.env.BUILD_STATUS_WEBHOOK
const EMOJI_TIRESOME = '<:tiresome:1023676964319535286>'
const EMOJI_BINOCULARS = '<:binoculars:1012832136459456582>'
const EMOJI_LLAMACHEER = '<:llamacheer:1012832279195832331>'

const llamaMentions = BUILD_STATUS_LLAMAS.split(',')
	.map((llama) => `<@!${llama}>`)
	.join(' ')

// node ./scripts/build-msg.js $BUILD_STATUS "$BUILD_TIME_STR" "$START_TIME" "$BUILD_ID" "$COMMIT_COMMENT" "$COMMIT_AUTHOR" "$COMMIT_HASH"
const BUILD_STATUS = process.argv[2]
const BUILD_TIME_STR = process.argv[3]
const START_TIME = process.argv[4]
const BUILD_ID = process.argv[5]
const COMMIT_COMMENT = process.argv[6]
const COMMIT_AUTHOR = process.argv[7]
const COMMIT_HASH = process.argv[8]

let buildSummary = ''
if (BUILD_STATUS === '0') {
	buildSummary += `🎉 Build succeeded in ${BUILD_TIME_STR}`
} else {
	buildSummary += `🚨 Build failed in ${BUILD_TIME_STR}`
}
buildSummary += '\n' + `📅 Build started at ${START_TIME}`
if (BUILD_ID) {
	buildSummary += '\n' + `📦 Build ID: ${BUILD_ID}`
}

let commitSummary = ''
commitSummary += `💬 ${COMMIT_COMMENT}`
commitSummary += '\n' + `🦙 ${COMMIT_AUTHOR}`
commitSummary += '\n' + `📸 ${COMMIT_HASH}`

const sendMessages = async () => {
	const message = `\`\`\`\n${buildSummary}\n${commitSummary}\n\`\`\``
	const body = { content: message }
	await axios.post(BUILD_STATUS_WEBHOOK, body)

	if (BUILD_STATUS !== '0') {
		if (BUILD_STATUS_LLAMAS) {
			const llamaMessage = `${EMOJI_TIRESOME} ${llamaMentions}\n${EMOJI_BINOCULARS} ${BUILD_STATUS_DASHBOARD}`
			const llamaBody = { content: llamaMessage }
			await axios.post(BUILD_STATUS_WEBHOOK, llamaBody)
		}
	} else {
		const llamaMessage = `${EMOJI_LLAMACHEER}`
		const llamaBody = { content: llamaMessage }
		await axios.post(BUILD_STATUS_WEBHOOK, llamaBody)
	}
}

sendMessages()

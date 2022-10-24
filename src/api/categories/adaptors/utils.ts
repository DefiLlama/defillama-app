import { IJoin2ReturnType } from "."
import { IJSON, ProtocolAdaptorSummaryResponse } from "./types"

export const formatChain = (chain: string) => {
	if (!chain) return chain
	const ch = chain.toLowerCase()
	let c = ch === 'avax' ? "avalanche" : ch
	if (c === 'bsc') return c.toUpperCase()
	if (c === 'xdai') return "xDai"
	if (c === 'terra' || c === 'terra classic') return "Terra Classic"
	else
		return c[0].toUpperCase() + c.slice(1)
}

function pad(s: number) {
	return s < 10 ? "0" + s : s;
}

export function formatTimestampAsDate(timestamp: number) {
	const date = new Date(timestamp * 1000);
	return `${pad(date.getDate())}/${pad(
		date.getMonth() + 1
	)}/${date.getFullYear()}`;
}

export function chartBreakdownByVersion(chart: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']): [IJoin2ReturnType, string[]] {
	const legend = []
	const rawProcessed = chart.reduce((acc, [timestamp, data]) => {
		Object.entries(data).forEach(([_chain, chainData]) => {
			Object.entries(chainData).forEach(([protocolName, value]) => {
				if (!legend.includes(protocolName.toUpperCase())) legend.push(protocolName.toUpperCase())
				if (!acc[`${timestamp}${protocolName}`]) acc[`${timestamp}${protocolName}`] = {
					[protocolName.toUpperCase()]: getOkValue(value),
					date: String(timestamp)
				} as IJoin2ReturnType[number]
				else {
					acc[`${timestamp}${protocolName}`] = {
						[protocolName.toUpperCase()]: acc[`${timestamp}${protocolName}`][protocolName.toUpperCase()] += getOkValue(value),
						date: String(timestamp)
					} as IJoin2ReturnType[number]
				}
			})
		})
		return acc
	}, {} as IJSON<IJoin2ReturnType[number]>)
	return [Object.values(rawProcessed), legend]
}

const getOkValue = (value: number | IJSON<number>) => {
	if (typeof value === 'object') {
		return Object.values(value).reduce((acc, current) => acc += current, 0)
	}
	else return value
}

export function chartBreakdownByChain(chart: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']): [IJoin2ReturnType, string[]] {
	const legend = []
	const rawProcessed = chart.reduce((acc, [timestamp, data]) => {
		Object.entries(data).forEach(([chain, chainData]) => {
			Object.entries(chainData).forEach(([_protocolName, value]) => {
				if (!legend.includes(formatChain(chain))) legend.push(formatChain(chain))
				if (!acc[`${timestamp}${chain}`]) acc[`${timestamp}${chain}`] = {
					[formatChain(chain)]: getOkValue(value),
					date: String(timestamp)
				} as IJoin2ReturnType[number]
				else {
					acc[`${timestamp}${chain}`] = {
						[formatChain(chain)]: acc[`${timestamp}${chain}`][formatChain(chain)] += getOkValue(value),
						date: String(timestamp)
					} as IJoin2ReturnType[number]
				}
			})
		})
		return acc
	}, {} as IJSON<IJoin2ReturnType[number]>)
	return [Object.values(rawProcessed), legend]
}

export function chartBreakdownByTokens(chart: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']): [IJoin2ReturnType, string[]] {
	const legend = []
	const rawProcessed = chart.reduce((acc, [timestamp, data]) => {
		Object.entries(data).forEach(([chain, chainData]) => {
			Object.entries(chainData).forEach(([_protocolName, value]) => {
				if (typeof value === 'number') return
				Object.entries(value).forEach(([token, value]) => {
					if (!legend.includes(token)) legend.push(token)
					if (!acc[`${timestamp}${token}`]) acc[`${timestamp}${token}`] = {
						[token]: getOkValue(value),
						date: String(timestamp)
					} as IJoin2ReturnType[number]
					else {
						acc[`${timestamp}${token}`] = {
							[token]: acc[`${timestamp}${token}`][token] += getOkValue(value),
							date: String(timestamp)
						} as IJoin2ReturnType[number]
					}
				})
			})
		})
		return acc
	}, {} as IJSON<IJoin2ReturnType[number]>)
	return [Object.values(rawProcessed), legend]
}
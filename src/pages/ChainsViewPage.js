import React, { useEffect, useState, useMemo } from 'react'
import 'feather-icons'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { AutoRow, RowBetween } from '../components/Row'
import LocalLoader from '../components/LocalLoader'
import { chainIconUrl } from '../utils'
import List from '../components/List'
import { toK, toNiceCsvDate, toNiceDateYear, formattedNum, toNiceMonthlyDate } from '../utils'
import { ButtonDark } from '../components/ButtonStyled'


import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from "recharts";

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

const chainCoingeckoIds = {
    "Ethereum": "ethereum",
    "Binance": "binancecoin",
    "Avalanche": "avalanche-2",
    "Solana": "solana",
    "Polygon": "matic-network",
    "Terra": "terra-luna",
    "Fantom": "fantom",
    "xDai": "xdai-stake",
    "Heco": "huobi-token",
    "Kava": "kava",
    "OKExChain": "okexchain",
    "Wanchain": "wanchain",
    "DefiChain": "defichain",
    "Ontology": "ontology",
    "Bitcoin": "bitcoin",
    "Energi": "energi",
    "Secret": "secret",
    "Zilliqa": "zilliqa",
    "NEO": "neo",
    "Harmony": "harmony",
    "RSK": "rootstock",
    "Sifchain": "sifchain",
    "Algorand": "algorand",
    "Osmosis": "osmosis",
    "Thorchain": "thorchain",
    "Tron": "tron",
    "Icon": "icon",
}

function getPercentChange(previous, current) {
    return (current / previous) * 100 - 100;
}

const toPercent = (decimal, fixed = 0) =>
    `${(decimal * 100).toFixed(fixed)}%`;

const getPercent = (value, total) => {
    const ratio = total > 0 ? value / total : 0;

    return toPercent(ratio, 2);
};

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

const ChainsView = () => {
    let allTokens = useAllTokenData();

    const chainsUniqueSet = new Set();
    const numProtocolsPerChain = {}
    Object.values(allTokens).forEach((token) => {
        if (token.category === "Chain") return
        token.chains.forEach(chain => {
            chainsUniqueSet.add(chain)
            numProtocolsPerChain[chain] = (numProtocolsPerChain[chain] || 0) + 1
        })
    });
    const chainsUnique = Array.from(chainsUniqueSet)

    const [data, setData] = useState([]);
    const [chainMcaps, setChainMcaps] = useState({});
    const loading = data.length === 0;

    useEffect(() => {
        const chainsCalls = chainsUnique.map(elem => fetch(`https://api.llama.fi/charts/${elem}`).then(resp => resp.json()))
        Promise.all(chainsCalls).
            then(resp => {
                setData(resp)
            }).catch((err) => {
                console.log(err)
            })
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(chainCoingeckoIds).join(',')}&vs_currencies=usd&include_market_cap=true`).then(res => res.json()).then(setChainMcaps)
    }, []);

    const chainColor = useMemo(() => Object.fromEntries(chainsUnique.map(chain => [chain, getRandomColor()])), [chainsUnique])
    const chainTvls = useMemo(() => (data.length > 0 ? chainsUnique : []).map((chainName, i) => {
        const prevTvl = (daysBefore) => data[i][data[i].length - 1 - daysBefore]?.totalLiquidityUSD
        const current = prevTvl(0)
        return {
            tvl: current,
            mcap: chainMcaps[chainCoingeckoIds[chainName]]?.usd_market_cap,
            name: chainName,
            num_protocols: numProtocolsPerChain[chainName],
            logo: chainIconUrl(chainName),
            change_1d: prevTvl(1) ? getPercentChange(prevTvl(1), current) : null,
            change_7d: prevTvl(7) ? getPercentChange(prevTvl(7), current) : null,
        }
    }), [data, numProtocolsPerChain, chainMcaps, chainsUnique])

    //const defaultPoint = Object.fromEntries(chainsUnique.map(chain => [chain, undefined]))
    const [stackedDataset, daySum] = useMemo(() => {
        const daySum = {};
        const stacked = Object.values(data.reduce((total, chain, i) => {
            const chainName = chainsUnique[i]
            chain.forEach(dayTvl => {
                if (dayTvl.date < 1596248105) return
                if (total[dayTvl.date] === undefined) {
                    total[dayTvl.date] = { date: dayTvl.date }
                }
                total[dayTvl.date][chainName] = dayTvl.totalLiquidityUSD
                daySum[dayTvl.date] = (daySum[dayTvl.date] || 0) + dayTvl.totalLiquidityUSD
            })
            return total
        }, {}))
        return [stacked, daySum]
    }, [data])

    function downloadCsv() {
        const rows = [["Timestamp", "Date", ...chainsUnique]];
        stackedDataset.sort((a, b) => a.date - b.date).forEach(day => {
            rows.push([day.date, toNiceCsvDate(day.date), ...chainsUnique.map(chain => day[chain] ?? '')])
        })
        console.log(rows)
        download("chains.csv", rows.map(r => r.join(',')).join('\n'))
    }

    if (loading) {
        return <LocalLoader fill="true" />
    }

    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>Total Value Locked All Chains</TYPE.largeHeader>
                </RowBetween>

                <Panel style={{ padding: '18px 25px' }}>
                    <AutoRow>
                        <ResponsiveContainer>
                            <AreaChart
                                data={stackedDataset}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0
                                }}
                            >
                                <XAxis dataKey="date"
                                    tickFormatter={toNiceMonthlyDate}
                                />
                                <YAxis
                                    tickFormatter={tick => toK(tick)}
                                />
                                <Tooltip
                                    formatter={val => formattedNum(val)}
                                    labelFormatter={label => toNiceDateYear(label)}
                                    itemSorter={p => -p.value}
                                />
                                {chainsUnique.map(chainName => <Area
                                    type="monotone"
                                    dataKey={chainName}
                                    key={chainName}
                                    stackId="1"
                                    fill={chainColor[chainName]}
                                    stroke={chainColor[chainName]}
                                />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>

                        <AreaChart
                            width={500}
                            height={400}
                            data={stackedDataset}
                            stackOffset="expand"
                            margin={{
                                top: 10,
                                right: 30,
                                left: 0,
                                bottom: 0
                            }}
                        >
                            <XAxis dataKey="date"
                                tickFormatter={toNiceMonthlyDate}
                            />
                            <YAxis tickFormatter={num => toPercent(num)} />
                            <Tooltip
                                formatter={(val, chain, props) => getPercent(val, daySum[props.payload.date])}
                                labelFormatter={label => toNiceDateYear(label)}
                                itemSorter={p => -p.value}
                            />
                            {chainsUnique.map(chainName =>
                                <Area
                                    type="monotone"
                                    dataKey={chainName}
                                    key={chainName}
                                    stackId="1"
                                    fill={chainColor[chainName]}
                                    stroke={chainColor[chainName]}
                                />
                            )}
                        </AreaChart>
                    </AutoRow>
                </Panel>
                <List tokens={chainTvls} defaultSortingField="tvl" />
                <div style={{ margin: 'auto' }}>
                    <ButtonDark onClick={downloadCsv}>Download all data in .csv</ButtonDark>
                </div>
            </FullWrapper>
        </PageWrapper>
    )
}

export default ChainsView


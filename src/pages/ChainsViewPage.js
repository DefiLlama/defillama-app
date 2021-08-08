import React, { useEffect, useState } from 'react'
import 'feather-icons'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper } from '../components'
import { RowBetween } from '../components/Row'
import { AutoColumn } from '../components/Column'
import ChainsChart from '../components/ChainsChart'
import LocalLoader from '../components/LocalLoader'
import { chainIconUrl } from '../utils'
import List from '../components/List'

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


    if (loading) {
        return <LocalLoader fill="true" />
    }

    data.forEach(arr => {
        arr.forEach(elem => {
            elem.date = new Date(Number(elem.date) * 1000).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" })
        })
    })

    //create a list for datasets for multiline chart 
    const getDatasets = (data, chains) => {
        const datasets = []
        chains.forEach((element, i) => {
            const clr = getRandomColor()
            const dataset = {
                label: element,
                data: data[i],
                borderColor: clr,
                backgroundColor: clr,
                fill: true,
            };
            datasets.push(dataset);
        });
        return datasets;
    }
    const chainTvls = chainsUnique.map((chainName, i) => {
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
    })

    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>Total Value Locked All Chains</TYPE.largeHeader>
                </RowBetween>

                <Panel style={{ padding: '18px 25px' }}>
                    <AutoColumn>
                        <ChainsChart datasets={getDatasets(data, chainsUnique)}
                            xAxisKey={'date'}
                            yAxisKey={'totalLiquidityUSD'}></ChainsChart>
                    </AutoColumn>
                </Panel>
                <List tokens={chainTvls} defaultSortingField="tvl" />
            </FullWrapper>
        </PageWrapper>
    )
}

export default ChainsView


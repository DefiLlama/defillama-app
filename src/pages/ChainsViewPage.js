import React, { useEffect, useState } from 'react'
import 'feather-icons'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper, ContentWrapper } from '../components'
import { RowBetween } from '../components/Row'
import { AutoColumn } from '../components/Column'
import ChainsChart from '../components/ChainsChart'
import LocalLoader from '../components/LocalLoader'


// import React from 'react'

const ChainsView = () => {
    let allTokens = useAllTokenData();

    const allChains = Object.values(allTokens).map((chain) => {
        return chain.chain
    });

    const getUnique = arr => {
        return arr.filter((value, index, self) => {
            return self.indexOf(value) === index;
        });
    };

    const chainsUnique = getUnique(allChains);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const chainsCalls = chainsUnique.map(elem => fetch(`https://api.llama.fi/charts/${elem}`).then(resp => resp.json()))
        Promise.all(chainsCalls).
            then(resp => {
                setData([...data, resp])
            }).catch((err) => {
                console.log(err)
            }).
            finally(() => {
                setLoading(false);
            });
    }, []);


    if (loading) {
        return <LocalLoader fill="true" />
    }

    console.log(data)
    data[0].forEach(arr => {
        arr.forEach(elem => {
            elem.date = new Date(Number(elem.date) * 1000).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" })
        })
    })

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    //create a list for datasets for multiline chart 
    const getDatasets = (data, chains) => {
        const datasets = []
        var i = 0;
        chains.forEach(element => {
            const clr = getRandomColor()
            const dataset = {
                label: element,
                data: data[0][i],
                borderColor: clr,
                backgroundColor: clr,
                fill: true,
            };
            i++;
            datasets.push(dataset);
        });
        return datasets;
    }
    console.log(data[0][0])

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
            </FullWrapper>
        </PageWrapper>
    )
}

export default ChainsView


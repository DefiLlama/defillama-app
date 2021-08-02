import React, { useEffect } from 'react'
import 'feather-icons'

import { TYPE } from '../Theme'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { PageWrapper, FullWrapper, ContentWrapper } from '../components'
import Row, { RowBetween } from '../components/Row'
import { AutoColumn } from '../components/Column'
import ChainsChart from '../components/ChainsChart'


import { useAllTokenData } from '../../contexts/TokenData'


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

    axios.defaults.baseURL = 'https://api.llama.fi/charts/';

    const chainsCalls = chainsUnique.map(elem => { return axios.get(elem) })

    useEffect(() => {
        Promise.all(chainsCalls).
            then(resp => {

                const a = []
                resp.map(elem => {
                    a.push(elem.data)
                });
                setData([...data, a])
            }).catch((err) => {
                console.log(err)
            }).
            finally(() => {
                setLoading(false);
            });
    }, []);


    if (loading) {
        return <p>Data is loading...</p>;
    }

    data[0].forEach(arr => {
        arr.forEach(elem => {
            elem.date = new Date(Number(elem.date) * 1000).toDateString()
            console.log(elem)
        })
    })


    return (
        <PageWrapper>
            <FullWrapper>
                <RowBetween>
                    <TYPE.largeHeader>Total Value Locked All Chains</TYPE.largeHeader>
                </RowBetween>

                <Panel style={{ padding: '18px 25px' }}>
                    <AutoColumn>
                        <ChainsChart></ChainsChart>
                    </AutoColumn>
                </Panel>
            </FullWrapper>
        </PageWrapper>
    )
}

export default ChainsView


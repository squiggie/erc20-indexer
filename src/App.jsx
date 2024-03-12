import {Box, Button, Center, Flex, Heading, Image, Input, SimpleGrid, Spinner, Text, useToast,} from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState({ tokenBalances: [] });
  const [hasQueried, setHasQueried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const toast = useToast();
  const [tokensByNetwork, setTokensByNetwork] = useState({});

  const networksConfig = {
    eth_mainnet: {
      name: "Ethereum Mainnet",
      apiKey: import.meta.env.VITE_ETH_API_KEY,
      network: Network.ETH_MAINNET,
    },
/*     eth_polygon: {
      name: "Polygon",
      apiKey: import.meta.env.VITE_POLY_API_KEY,
      network: Network.MATIC_MAINNET,
    }, */
    eth_arb: {
      name: "Arbitrum",
      apiKey: import.meta.env.VITE_ARB_API_KEY,
      network: Network.ARB_MAINNET,
    },
    eth_op: {
      name: "Optimism",
      apiKey: import.meta.env.VITE_OP_API_KEY,
      network: Network.OPT_MAINNET,
    }
  };

  useEffect(() => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      console.log('MetaMask is installed!');
    } else {
      toast({
        title: 'MetaMask is not installed',
        description: 'Please install MetaMask to use this feature.',
        status: 'warning',
        duration: 9000,
        isClosable: true,
      });
    }
  }, []);
  async function getAllTokenBalances() {
    setLoading(true);
    setHasQueried(false);
    const tokensResults = {};
  
    for (const [networkKey, config] of Object.entries(networksConfig)) {
      const alchemyConfig = {
        apiKey: config.apiKey,
        network: config.network,
      };
      const alchemy = new Alchemy(alchemyConfig);
  
      try {
        const balances = await alchemy.core.getTokenBalances(userAddress);
        const tokenDataPromises = balances.tokenBalances.filter(token => token.tokenBalance !== "0x0").map(async token => {
          return await alchemy.core.getTokenMetadata(token.contractAddress);
        });
        const tokenData = await Promise.all(tokenDataPromises);
  
        tokensResults[networkKey] = tokenData.map((data, index) => ({
          ...data,
          balance: balances.tokenBalances[index].tokenBalance,
        }));
      } catch (error) {
        console.error(`Failed to fetch tokens for ${config.name}:`, error);
        tokensResults[networkKey] = [];
      }
      finally {
        setLoading(false);
      }
    }
  
    setTokensByNetwork(tokensResults);
  }
  async function connectWallet() {
    try {
      if (window.ethereum && window.ethereum.isMetaMask) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setUserAddress(accounts[0]);
        toast({
          title: 'Wallet connected',
          description: `Address: ${accounts[0]}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error connecting to wallet',
          description: 'MetaMask not installed or not detected.',
          status: 'error',
          duration: 9000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error connecting to wallet',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    }
  }


  async function getTokenBalance() {
    setLoading(true);
    setHasQueried(false);
    try {
      const config = {
        apiKey: import.meta.env.VITE_ETH_API_KEY,
        network: Network.ETH_MAINNET,
      };
      
      const alchemy = new Alchemy(config);
      const data = await alchemy.core.getTokenBalances(userAddress);
      setResults(data);

      const tokenDataPromises = data.tokenBalances.map(token =>
        alchemy.core.getTokenMetadata(token.contractAddress)
      );

      setTokenDataObjects(await Promise.all(tokenDataPromises));
      setHasQueried(true);
    } catch (error) {
      toast({
        title: 'Error fetching token balances',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={36}>
            ERC-20 Token Indexer
          </Heading>
          <Text>
            Plug in an address and this website will return all of its ERC-20
            token balances!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={'center'}
      >
        <Heading mt={42}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Input
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
        />
        <Button fontSize={20} onClick={getAllTokenBalances} mt={36} bgColor="black" color="white">
          Check ERC-20 Token Balances
        </Button>
        <Button fontSize={20} onClick={connectWallet} mt={8} bgColor="black" color="white">
          Connect Wallet
        </Button>
        <Heading my={36}>ERC-20 token balances</Heading>

        {loading ? (
          <Center h="100px">
            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl"/>
          </Center>
        ) : (
            <SimpleGrid w={'90vw'} columns={2} spacing={10}>
            {Object.entries(tokensByNetwork).map(([networkKey, tokens]) => (
                  <div key={networkKey}>
                    <h2>{networksConfig[networkKey].name}</h2>
                    <SimpleGrid columns={4} spacing={5}>
                      {tokens.map((token, index) => (
                        <Box key={index} p={5} shadow="md" borderWidth="1px">
                          <Text><b>Symbol:</b> {token.symbol}</Text>
                          <Text><b>Balance:</b> {parseFloat(ethers.utils.formatEther(token.balance)).toFixed(2)}</Text>
                          {/* Display token image if available */}
                          {token.logo && <Image src={token.logo} alt={`${token.symbol} logo`} boxSize="50px" />}
                        </Box>
                      ))}
                    </SimpleGrid>
                  </div>
                ))}
          </SimpleGrid>
          )}
      </Flex>
    </Box>
  );
}

export default App;

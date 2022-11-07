import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { BigNumber, Contract, providers, utils } from "ethers";
import {
  CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
  CRYPTO_DEV_TOKEN_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  NFT_CONTRACT_ABI,
} from "../constants";

export default function Home() {
  const zero = BigNumber.from(0);
  const perTokenPrice = 0.00001;

  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  const [mintedTokensByUser, setMintedTokensByUser] = useState(zero);
  const [totalMintedTokens, setTotalMintedTokens] = useState(zero);
  const [isOwner, setIsOwner] = useState(false);
  const [tokensAmountToMint, setTokensAmountToMint] = useState(zero);

  const web3ModalRef = useRef();

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
    }

    checkIsOwner();
    calculateMintedTokensByUser();
    calculateTotalMintedTokens();
    getTokensToBeClaimed();
  }, [walletConnected]);

  const connectWallet = async () => {
    try {
      setIsLoading(true);

      const provider = await getProviderOrSigner();
      if (provider) setWalletConnected(true);

      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const currentProvider = await web3ModalRef.current.connect();
    const web3provider = new providers.Web3Provider(currentProvider);

    const { chainId } = await web3provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Please connect your wallet using Goerli testnet!");
      throw new Error("Please connect your wallet using Goerli testnet!");
    }
    return needSigner ? web3provider.getSigner() : web3provider;
  };

  const checkIsOwner = async () => {
    const provider = await getProviderOrSigner();
    const contract = new Contract(
      CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
      CRYPTO_DEV_TOKEN_CONTRACT_ABI,
      provider
    );
    const contractOwner = await contract.owner();

    const signer = await getProviderOrSigner(true);
    const userAddress = await signer.getAddress();
    setIsOwner(userAddress.toLowerCase() === contractOwner.toLowerCase());
  };

  const getTokensToBeClaimed = async () => {
    const signer = await getProviderOrSigner(true);
    const userAddress = await signer.getAddress();

    const provider = await getProviderOrSigner();
    const nftContract = new Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      provider
    );
    const cryptoDevContract = new Contract(
      CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
      CRYPTO_DEV_TOKEN_CONTRACT_ABI,
      provider
    );

    const nftBalance = await nftContract.balanceOf(userAddress);
    if (nftBalance > zero) {
      var _tokensToBeClaimed = 0;
      for (let i = 0; i < nftBalance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
        const claimed = await cryptoDevContract.claimedTokenIDs(tokenId);
        if (!claimed) _tokensToBeClaimed++;
      }
      setTokensToBeClaimed(BigNumber.from(_tokensToBeClaimed));
    } else {
      setTokensToBeClaimed(zero);
    }
  };

  const claimTokens = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = new Contract(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
        CRYPTO_DEV_TOKEN_CONTRACT_ABI,
        signer
      );
      setIsLoading(true);
      const tx = await contract.claim();
      await tx.wait();
      setIsLoading(false);
      window.alert("Your crypto dev tokens are successfully claimed!");

      await calculateMintedTokensByUser();
      await calculateTotalMintedTokens();
      await getTokensToBeClaimed();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const mintTokens = async (numOfTokens) => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = new Contract(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
        CRYPTO_DEV_TOKEN_CONTRACT_ABI,
        signer
      );
      setIsLoading(true);
      const value = numOfTokens * perTokenPrice;
      const tx = await contract.mint(numOfTokens, {
        value: utils.parseEther(value.toString()),
      });
      await tx.wait();
      setIsLoading(false);
      window.alert("You've sucessfully minted crypto dev tokens!");

      await calculateMintedTokensByUser();
      await calculateTotalMintedTokens();
      await getTokensToBeClaimed();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const withdrawTokens = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const contract = new Contract(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
        CRYPTO_DEV_TOKEN_CONTRACT_ABI,
        signer
      );

      const provider = await getProviderOrSigner();
      const contractBalance = await provider.getBalance(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS
      );

      if (contractBalance.gt(0)) {
        setIsLoading(true);
        const tx = await contract.withdraw();
        await tx.wait();
        setIsLoading(false);
        window.alert("You've successfully withdrawn the tokens");

        await calculateMintedTokensByUser();
        await calculateTotalMintedTokens();
        await getTokensToBeClaimed();
      } else {
        window.alert("There is nothing to withdraw. Balance is 0.");
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const renderButton = () => {
    if (isLoading) {
      return (
        <div className={styles.description}>
          <button className={styles.button}>Processing ...Wait!</button>
        </div>
      );
    }
    if (isOwner) {
      return (
        <div className={styles.description}>
          <button className={styles.button} onClick={withdrawTokens}>
            Withdraw
          </button>
        </div>
      );
    }

    if (tokensToBeClaimed > 0) {
      return (
        <div className={styles.description}>
          {tokensToBeClaimed * 10} tokens can be claimed! <br />
          <br />
          <button className={styles.button} onClick={claimTokens}>
            Claim your tokens!
          </button>
        </div>
      );
    } else {
      return (
        <div className={styles.description}>
          <input
            type="number"
            placeholder="Amount of tokens"
            onChange={(e) => {
              setTokensAmountToMint(
                e.target.value.trim() !== ""
                  ? BigNumber.from(e.target.value)
                  : zero
              );
            }}
            className={styles.input}
          />
          <br />
          <br />
          <button
            className={styles.button}
            onClick={() => mintTokens(tokensAmountToMint)}
          >
            Mint
          </button>
        </div>
      );
    }
  };

  const calculateMintedTokensByUser = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = new Contract(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
        CRYPTO_DEV_TOKEN_CONTRACT_ABI,
        provider
      );

      const signer = await getProviderOrSigner(true);
      const _mintedTokensByUser = await contract.balanceOf(signer.getAddress());
      setMintedTokensByUser(_mintedTokensByUser);
    } catch (error) {
      console.error(error);
      setMintedTokensByUser(zero);
    }
  };

  const calculateTotalMintedTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = new Contract(
        CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS,
        CRYPTO_DEV_TOKEN_CONTRACT_ABI,
        provider
      );

      const _totalMintedTokens = await contract.totalSupply();
      setTotalMintedTokens(_totalMintedTokens);
    } catch (error) {
      console.error(error);
      setTotalMintedTokens(zero);
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Dev Token - Initial Coin Offering</title>
        <meta
          name="description"
          content="CryptoDevToken dApp for Initial Coin Offering "
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to CryptoDev Token ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                You have minted {utils.formatEther(mintedTokensByUser)} Crypo
                Dev tokens here
              </div>
              <div className={styles.description}>
                Overall {utils.formatEther(totalMintedTokens)}/10,000 tokens
                have been minted !!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <div className={styles.description}>
              <button className={styles.button} onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          )}
        </div>
        <div>
          <img src="/0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Kazim&#169;
      </footer>
    </div>
  );
}

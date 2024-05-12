### Solana TG bot
- Rename the demo_env file to .env add the Bot token and run the script

### Cmds
- `/start` -> To set wallet and some setting
- `/wallet` -> To setup the wallets key
- `/deploytoken` -> To create the token
- `/mint` -> Token minting
- `/transfer` -> Token transferring
- `/burn` -> to burn the tokens
- `/lpburn` -> To burn the liquidity tokens recevied from pool creation or liquidity add
- `/revokeauth` -> Revoke token authority(token minting and freezing)
- `/createmarket` -> To create the market which is useful for to create the pool
- `/createpool` -> To create pool on raydium program
- `/addliquidity` -> Add liquidity in pool
- `/buy` -> Buy token from pool (token swap)
- `/addandbuy` -> Add liquidity and buy(swap) within one transaction (at a same time)
- `/createpoolandbuy` -> Pool creation and buy(swap) within one transaction
- `/setting` -> Setting for slippage and solana network (*_devnet_* / *_mainnet_*)
- `/exit` -> To get exit from any process or action


### NOTEs:
- In create pool and buy process second wallet is require also second wallet should have some sol balance if distribution is toggled on, also second wallet should have some fund to buy (swap) the tokens.

- For IPFS storage here used `pinata` api to store token metadta, You can get api keys from `https://www.pinata.cloud/` website by creating a account
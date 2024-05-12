import { config } from "dotenv";
import { web3 } from "@project-serum/anchor";
config()

export const DEFAULT_TOKEN_DECIMAL = 6
export const TX_SEND_FAILD_ERROR_MSG = "FAILD TO SEND THE TRANSACTION";
export const KEYPAIR_NOT_FOUND_ERR_MSG = "Keypair not found Please set your keypair first"
export const FILL_FORM_MSG = "Please fill all the values first ❗"

const RPC_ENDPOINT_URL_DEV = process.env.RPC_ENDPOINT_URL_DEV!;
const RPC_ENDPOINT_URL_MAIN = process.env.RPC_ENDPOINT_URL_MAIN!;
const IN_PRODUCTION = process.env.PRODUCTION == "1" ? true : false;
const PINATA_API_kEY = process.env.PINATA_API_KEY!
const PINATA_API_SECRET_KEY = process.env.PINATA_API_SECRET_KEY!
const feeReceiver = new web3.PublicKey(process.env.FEE_RECEIVER ?? "")
// const JITO_AUTH_KEYPAIR = getKeypairFromStr(process.env.JITO_AUTH_KEYPAIR!);
const JITO_AUTH_KEYPAIR = web3.Keypair.generate()
const JITO_BLOCK_ENGINE_URL = process.env.JITO_BLOCK_ENGINE_URL ?? "null"
// const JITO_BLOCK_ENGINE_URL = "bcd"
if (!feeReceiver) throw "Fee receiver address not found"
if (!JITO_AUTH_KEYPAIR) throw "JITO auth keypair  not found"
if (!JITO_BLOCK_ENGINE_URL) throw "JITO block engine url not found"

export const ENV = {
    RPC_ENDPOINT_URL_DEV,
    RPC_ENDPOINT_URL_MAIN,
    IN_PRODUCTION,
    RPC_ENDPOINT_URL: IN_PRODUCTION ? RPC_ENDPOINT_URL_MAIN : RPC_ENDPOINT_URL_DEV,

    PINATA_API_kEY,
    PINATA_API_SECRET_KEY,

    FEE_RECEIVER: feeReceiver,
    JITO_AUTH_KEYPAIR,
    JITO_BLOCK_ENGINE_URL,
}

export const icons = {
    EDIT_PENCIL: "✏️",
    TICK_MARK: "🟢",
    CROSS_SIGN: "🔴",
    LAUNCH_SIGN: "🚀",
    BURN_SIGN: "🔥",
    SETTING_GEAR: "⚙",
    NETWORK: "🌐",
    TOGGLE: "🔄",
    PLUS: "➕",
    MINUS: "➖",
    WALLET: "👝",
    BOT: '🤖',
    HELP: "ℹ️",
    NEW: "🆕",
    WARN: "⚠️"
}

// CMD
export const CMDS = {
    SET_KEYPAIR_CMD: '/setkey',
    START_CMD: '/start',
    WALLET_CMD: '/wallet',
    CREATE_POOL_AND_BUY_CMD: '/createpoolandbuy',
    SETTING_CMD: '/setting',
}
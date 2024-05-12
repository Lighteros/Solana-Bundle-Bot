import { Bot, Context, SessionFlavor } from "grammy";
import { session } from "grammy";
import { CreatePoolAndBuySessionInfo, SettingSessionInfo } from "./types/sessionInfo";
import { SessionHandler } from "./sessionHandler";
import { ENV } from "./constants";
import { Percent } from "@raydium-io/raydium-sdk";


export interface SesstionState {
    process: { current: "START", info?: any }
    | { current: "SET_KEY", info?: {} }
    | { current: "WALLET", info?: {} }
    | { current: "SETTING", info?: any }
    | { current: "NULL", info?: {} }
    | { current: "CREATE_POOL_AND_BUY", info?: CreatePoolAndBuySessionInfo }
    settings?: SettingSessionInfo
    sesionHandler: SessionHandler
    preTmpMsgs?: number[],
    task?: string,
}

export type MyContext = Context & SessionFlavor<SesstionState>;

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw "BOT TOKEN NOT FOUND"
export const bot = new Bot<MyContext>(BOT_TOKEN);

export const defaultSettings: SettingSessionInfo = {
    networkType: ENV.IN_PRODUCTION ? "mainnet" : 'devnet',
    rpcEndPointUrl: ENV.RPC_ENDPOINT_URL,
    slippageTolerance: new Percent(1, 100), // 1%
    slippageToleranceStr: "1%",
    // currentWallet: getKeypairFromStr(process.env.TEST_KP ?? "") as any,
    // secondWallet: getKeypairFromStr(process.env.TEST_KP2 ?? "") as any
}

const sessionHandler = new SessionHandler(defaultSettings.rpcEndPointUrl) // commond state
function initial(): SesstionState {
    return {
        process: { current: "NULL" },
        sesionHandler: sessionHandler,
        // settings: ENV.IN_PRODUCTION ? undefined : defaultSettings,
        settings: undefined
    }
}


bot.use(session({ initial }))

async function startBotServer() {
    bot.start().then(() => {
        console.log("bot is running ...")
    }).catch(() => {
        startBotServer();
    })
}
startBotServer()
export default bot
import { web3 } from "@project-serum/anchor";
import { SesstionState } from "./bot";
import { SessionHandler } from "./sessionHandler";
import Axios from "axios";
import { ENV } from "./constants";
import { Percent } from "@raydium-io/raydium-sdk";

const log = console.log;

export function isFound<T>(value: T | undefined) {
  if (value == undefined) {
    return false;
  }
  return true;
}

export function closeSession(session: SesstionState) {
  session.process = { current: "NULL", info: undefined };
}

export function getSessionHandler(session: SesstionState): SessionHandler {
  const rpcEndpointUrlMainnet = process.env.RPC_ENDPOINT_URL_MAIN;
  const rpcEndpointUrlDevnet = process.env.RPC_ENDPOINT_URL_DEV;
  if (!rpcEndpointUrlDevnet || !rpcEndpointUrlMainnet)
    throw "rpcEndpointUrl not found";
  session.sesionHandler =
    session.sesionHandler ?? new SessionHandler(rpcEndpointUrlMainnet);
  return session.sesionHandler;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deployJsonData(data: any): Promise<string | null> {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  const pinataApiKey = ENV.PINATA_API_kEY;
  const pinataSecretApiKey = ENV.PINATA_API_SECRET_KEY;

  return Axios.post(url, data, {
    headers: {
      "Content-Type": `application/json`,
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretApiKey,
    },
  })
    .then(function (response: any) {
      return response?.data?.IpfsHash;
    })
    .catch(function (error: any) {
      console.log({ jsonUploadErr: error });
      return null;
    });
}

export async function getNativePriceFromPoolId(
  poolId: string,
): Promise<number | null> {
  let nativePrice: number | null;
  try {
    const poolInfoRes = await (
      await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/solana/${poolId}`,
      )
    ).json();
    nativePrice = poolInfoRes?.pairs[0].priceNative;
  } catch (error) {
    log({ failedToFetchPoolInfo: error });
    return null;
  }
  if (nativePrice == null) return null;
  return nativePrice;
}

export function getPubkeyFromMsg(msg?: string) {
  try {
    return new web3.PublicKey((msg ?? "").trim());
  } catch (error) {
    return null;
  }
}
export function parseNumberFromMsg(msg?: string) {
  if (!msg) return null;
  try {
    const number = Number(msg);
    if (Number.isNaN(number)) return null;
    return number;
  } catch (error) {
    return null;
  }
}

export function getTxLink(network: "mainnet" | "devnet", txSignature: string) {
  if (network == "devnet") {
    return `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
  }
  return `https://explorer.solana.com/tx/${txSignature}`;
}
export function getAddressLink(network: "mainnet" | "devnet", address: string) {
  if (network == "devnet") {
    return `https://explorer.solana.com/address/${address}?cluster=devnet`;
  }
  return `https://explorer.solana.com/address/${address}`;
  //TODO:
}

export function getCmdFromMsg(msg?: string) {
  if (!msg) return null;
  msg = msg.trim();
  if (msg[0] == "/") {
    return msg.slice(0).split(" ")[0];
  }
  return null;
}

export function getSlippage(value?: number) {
  try {
    const slippageVal = value ?? 0;
    let denominator = (slippageVal.toString().split(".")[1] ?? "").length;
    denominator = 10 ** denominator;
    const number = slippageVal * denominator;
    denominator = denominator * 100;
    const slippage = new Percent(number, denominator);
    return slippage;
  } catch (error) {
    return new Percent(1, 100);
    // throw "failed to parse slippage input"
  }
}

import { Context } from "grammy";
import { SesstionState } from "./bot";
import { closeSession } from "./utils";
import { web3 } from "@project-serum/anchor";
import TxApi from "./txApi";

const replyOtherOpt = {
  parse_mode: "Markdown",
  link_preview_options: { is_disabled: true },
} as any;

export class SessionHandler {
  txHandler: TxApi;
  private connection: web3.Connection;

  constructor(rpcEndpointUrl: string) {
    this.txHandler = new TxApi({ rpcEndpointUrl });
    this.connection = new web3.Connection(rpcEndpointUrl);
  }

  updateRpcEndPoint = (rpcEndpointUrl: string) => {
    this.txHandler = new TxApi({ rpcEndpointUrl });
  };
  getRpcEndPointUrl = () => this.txHandler.getRpcEndPointUrl();

  async createPoolAndBuy(
    session: SesstionState,
    ctx: Context,
    keypair: web3.Keypair,
  ) {
    if (session.process.current != "CREATE_POOL_AND_BUY") return;
    const msg = ctx.message?.text;
    const info = session.process.info;
    if (!info || !info.marketId) {
      try {
        const marketId = new web3.PublicKey((msg ?? "").trim());
        session.process.info = { marketId };
      } catch (error) {
        return ctx.reply("Please enter valid market id address");
      }
      return ctx.reply("Enter Base token address");
    } else if (!info.baseMint) {
      try {
        const baseMint = new web3.PublicKey((msg ?? "").trim());
        info.baseMint = baseMint;
      } catch (error) {
        return ctx.reply("Please enter valid base token address");
      }
      return ctx.reply("Enter quote token address");
    } else if (!info.quoteMint) {
      try {
        const quoteMint = new web3.PublicKey((msg ?? "").trim());
        info.quoteMint = quoteMint;
      } catch (error) {
        return ctx.reply("Please enter valid quote token address");
      }
      return ctx.reply("Enter base token amount");
    } else if (!info.initBaseMintAmount) {
      const amount = Number(msg ?? "");
      if (!amount || Number.isNaN(amount) || amount < 0) {
        return ctx.reply("Please Enter valid base token amount");
      }
      info.initBaseMintAmount = amount;
      return ctx.reply("Enter quote token amount");
    } else if (!info.initQuoteMintAmount) {
      const amount = Number(msg ?? "");
      if (!amount || Number.isNaN(amount) || amount < 0) {
        return ctx.reply("Please Enter valid quote token amount");
      }
      info.initQuoteMintAmount = amount;
      return ctx.reply("Which token you want to buy ? (base/quote)");
    } else if (!info.buyTokenType) {
      const chat = msg?.trim() ?? "";
      if (chat != "base" && chat != "quote") {
        await ctx.reply("Invalid input");
        return ctx.reply("Which token you want to buy ? (base/quote)");
      }
      info.buyTokenType = chat;
      return ctx.reply(`How many ${chat} tokens you want to buy`);
    } else if (!info.buyAmount) {
      const amount = Number(msg?.trim() ?? "");
      if (!amount || Number.isNaN(amount)) {
        return ctx.reply("Please enter valid amount");
      }
      info.buyAmount = amount;
    }
    closeSession(session);
    const {
      baseMint,
      buyAmount,
      marketId,
      quoteMint,
      buyTokenType,
      initBaseMintAmount,
      initQuoteMintAmount,
    } = info;
    const res = await this.txHandler
      .createPoolAndBuy(
        {
          baseMint,
          buyAmount,
          buyTokenType,
          initBaseMintAmount,
          initQuoteMintAmount,
          marketId,
          quoteMint,
          secondWallet: web3.Keypair.generate(),
        },
        keypair,
      )
      .catch(() => null);
    if (!res) return ctx.reply("Failed to create the transaction");
    if (res.Err) return ctx.reply(res.Err);
    if (res.Ok)
      return ctx.reply(
        `Pool creation with buy transaction executed successfully.\nPool ID: ${res.Ok.poolId} [click_here](https://explorer.solana.com/tx/${res.Ok.txSignature}?cluster=devnet) to check tx`,
        replyOtherOpt,
      );
  }
}

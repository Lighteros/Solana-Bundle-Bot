import { config } from "dotenv";
import bot, { MyContext } from "./bot";
import { getCmdFromMsg } from "./utils";
import {
  getSessionHandler as getSessionHandler,
  setUpQueryCallBack,
} from "./session/utils";
import { getUserKeypairFromChatId } from "./db";
import { CMDS, icons } from "./constants";
import { WalletSessionHandler } from "./session/wallet";
import { SettingSessionHandler } from "./session/settings";
import { StartSessionHandler } from "./session/start";
import { InlineKeyboard } from "grammy";

config();
const log = console.log;

async function handleCmd(ctx: MyContext, cmd: string) {
  const { SETTING_CMD, WALLET_CMD, CREATE_POOL_AND_BUY_CMD, START_CMD } = CMDS;

  ctx.session.process.info = {};
  try {

    switch (cmd) {
      case START_CMD: {
        ctx.session.process.current = "START";
        const handler = new StartSessionHandler(ctx);
        await handler.sendPreview();
        return;
      }
      case SETTING_CMD: {
        ctx.session.process.current = "SETTING";
        const handler = new SettingSessionHandler(ctx);
        await handler.sendPreview();
        break;
      }

      case WALLET_CMD: {
        ctx.session.process.current = "WALLET";
        const handler = new WalletSessionHandler(ctx);
        await handler.sendPreview();
        return;
      }

      case CREATE_POOL_AND_BUY_CMD: {
        const keypair = getUserKeypairFromChatId(ctx);
        if (!keypair) {
          await ctx.reply(icons.WARN + " Please set your wallets /start");
          return;
        }
        const secondWallet = ctx.session.settings?.secondWallet;
        if (!secondWallet) {
          await ctx.reply(
            "Second wallet is require to perfrom this transaction",
          );
          return;
        }
        ctx.session.process = {
          current: "CREATE_POOL_AND_BUY",
          info: undefined,
        };
        const keyboard = new InlineKeyboard();
        keyboard.text("Yes", "CREATE_POOL_AND_BUY:YES");
        keyboard.text("No", "CREATE_POOL_AND_BUY:NO");
        await ctx.reply(
          "You will be charged 5 SOL fee for your bundled launch, do you want to proceed?",
          { reply_markup: keyboard },
        );
        break;
      }

      default:
        break;
    }
  } catch (error) {
    log({
      cmd,
      error,
    });
  }
}

async function main() {
  setUpQueryCallBack();
  bot.on("message:text", async (ctx) => {
    const msg = ctx.message.text;
    const cmd = getCmdFromMsg(msg);
    if (cmd) {
      await handleCmd(ctx, cmd);
      return;
    }

    const currentProcess = ctx.session.process.current;

    const handler = getSessionHandler(ctx);
    if (!handler) {
      log(
        `session handler not found! | currentProcess: ${ctx.session.process.current}`,
      );
      return;
    }
    await handler.handleMsg().catch((error) => {
      log({
        handleMsgError: {
          msg,
          currentProcess,
          error,
        },
      });
    });
  });
}
main().then(() => console.log("Bot is running..."));

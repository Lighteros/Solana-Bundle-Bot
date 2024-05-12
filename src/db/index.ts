import { web3 } from "@project-serum/anchor";
import { config } from "dotenv";
import { getKeypairFromStr } from "../base/utils";
import { MyContext } from "../bot";
config();

const log = console.log;
const test_chat_id = process.env.CHAT_ID
const test_kp = getKeypairFromStr(process.env.TEST_KP ?? "")

export function getUserKeypairFromChatId(ctx: MyContext) {
    return ctx.session.settings?.currentWallet
}

// export function setUserKeypairInSession(ctx: MyContext, keypair: web3.Keypair) {
//     const chatId = ctx.chat?.id
//     if (chatId) {
//         ctx.session.settings.currentWallet = keypair
//     }
// }

import mongoose from "mongoose";
const DB_URI = process.env.DB_URI
if (!DB_URI) throw "DB URL not found"
mongoose.connect(DB_URI);
const UserSchema = new mongoose.Schema({
    // username: String,
    chatId: Number,
    privateKey: String,
    walletAddress: String,
    isPaid: Boolean,
});
const User = mongoose.model("users", UserSchema);

export async function getUser(ctx: MyContext) {
    const chatId = ctx.chat?.id
    if (!chatId) {
        throw "chatId and keypair not found"
    }
    const existingUser = await User.findOne({ chatId }).catch((findOneError) => {
        log({ findOneError })
        throw "failed to fetch data"
    });
    return existingUser
}

export async function saveUser(ctx: MyContext) {
    try {
        const chatId = ctx.chat?.id
        const keypair = ctx.session.settings?.currentWallet
        if (!chatId || !keypair) {
            throw "chatId or keypair not found"
        }
        let isPaid = false
        const existingUser = await User.findOne({ chatId }).catch((findOneError) => {
            log({ findOneError })
            throw "failed to fetch data"
        });
        if (existingUser) {
            isPaid = (existingUser.isPaid == true ? true : false)
        }
        const newUser = new User({
            chatId,
            privateKey: keypair.secretKey,
            walletAddress: keypair.publicKey,
            isPaid
        });
        // await newUser.save().catch(seveError => {
        //     log({ saveUser })
        //     throw "failed to save user"
        // });
        return true
    } catch (error) {
        log({ seveUserError: error })
        return true
    }
}

export async function isUserPaid(ctx: MyContext) {
    const chatId = ctx.chat?.id
    if (!chatId) {
        throw "chat Id not found"
    }
    const existingUser = await User.findOne({ chatId }).catch((findOneError) => {
        log({ findOneError })
        throw "failed to fetch data"
    });
    if (existingUser) {
        return existingUser.isPaid == true ? true : false
    }
    return false
}

export async function setUserPaid(ctx: MyContext) {
    try {
        const chatId = ctx.chat?.id
        if (!chatId) {
            throw "chat Id not found"
        }
        await User.updateOne({ chatId }, { isPaid: true }).catch((updateError) => {
            log({ updateError })
            throw "failed to update user info"
        });
        return true
    } catch (error) {
        log({ setUserPaidError: error })
        return false
    }
}

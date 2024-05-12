export type BotHandlerInputs = {
    rpcEndpointUrl: string,
}

export type Result<T, E = any> = {
    Ok?: T,
    Err?: E
}
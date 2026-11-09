import { AsyncLocalStorage } from "async_hooks";

export const executionContext = new AsyncLocalStorage();
import { expect } from "@playwright/test";

class ApiUtils {
    constructor(apiContext, args, page) {
        this.apiContext = apiContext;
        this.args = args;
        this.page = page;
    }
}

export { ApiUtils };
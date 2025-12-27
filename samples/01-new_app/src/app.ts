import * as xtask from "@xtaskjs/core";

async function main() {
    const kernel = await xtask.Bootstrap();}
main().catch(err => {
    console.error("Error starting the application:", err);
}); 
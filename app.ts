import {Bootstrap} from "@xtaskjs/core";

async function main() {
    const kernel = await Bootstrap();}
main().catch(err => {
    console.error("Error starting the application:", err);
}); 
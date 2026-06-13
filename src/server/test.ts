import "dotenv/config"
import {corsair} from "./corsair"

async function main(){
    const res = await corsair.withTenant('srvjha').gmail.api.threads.list({})
    console.log(res)
}

main();
import dotenv from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

const envPath = path.resolve(currentDirectory, "../../.env")

dotenv.config({path: envPath})

const requiredVariables = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME"
]

for(const variable of requiredVariables){
    if(!process.env[variable]){
        throw new Error(`Missing required environment variable: ${variable}`)
    }
}

const dbPort = Number(process.env.DB_PORT)

if(!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535){
    throw new Error("DB_PORT must be a valid port number.")
}

export const env = {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || "127.0.0.1",

    database: {
        host: process.env.DB_HOST,
        port: dbPort,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME
    }
}
import mysql from "mysql2/promise"
import { env } from "../config/env.js"

// This file configures the MySql connection 
// it waits for all connections to be filled and they are all resusable, 10 connections are reserved for this purpose, and there is no queue limit of connection requests

export const pool = mysql.createPool({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4"
})
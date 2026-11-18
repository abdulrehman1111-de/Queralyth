import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

import mysql from "mysql2/promise"
import { env } from "../../config/env.js"

const currentFilePath = fileURLToPath(import.meta.url)

const currentDirectory = path.dirname(currentFilePath)

const migrationsDirectory = path.resolve(currentDirectory, "../../../../../database/migrations")

console.log("Migrations directory:", migrationsDirectory)

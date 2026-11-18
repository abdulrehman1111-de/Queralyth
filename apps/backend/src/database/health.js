import { pool } from "./pool.js";

export async function checkDatabaseConnection(){
    let connection
    
    try{
        connection = await pool.getConnection()

        await connection.query("SELECT 1")

        return {
            status: "healthy",
            database: "connected"
        }
    }
    catch(error){
        return {
            status: "unhealthy",
            database: "disconnected",
        }
    }
    finally{
        if(connection){
            connection.release()
        }
    }
}
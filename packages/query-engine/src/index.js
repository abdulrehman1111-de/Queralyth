// Queralyth Query Engine
// Public entry point for query-engine functionality.

export const QUERY_ENGINE_VERSION = "0.1.0";

export function getQueryEngineInfo() {
  return {
    name: "queralyth-query-engine",
    version: QUERY_ENGINE_VERSION,
    status: "initialized"
  };
}

export function removeComments(sqlStatement){

  const sqlCommentRemoved = sqlStatement.replace(/--[ \t].*/, "")

  return sqlCommentRemoved
}

export function classifyStatement(sqlStatement){
  
  if(sqlStatement.trim().length === 0){
    return {
      type: "UNKNOWN"
    }
  }

  const sqlStatementType = sqlStatement.trim().split(/\s+/)[0].toUpperCase()

  return {
    type: sqlStatementType
  }
}
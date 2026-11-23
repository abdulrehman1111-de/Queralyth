// Queralyth Query Engine
// Public entry point for query-engine functionality.

export const QUERY_ENGINE_VERSION = "0.1.0";

export function getQueryEngineInfo() {
  return {
    name: "queralyth-query-engine",
    version: QUERY_ENGINE_VERSION,
    status: "initialized",
  };
}

export function removeComments(sqlStatement) {
  const sqlCommentRemoved = sqlScanner(sqlStatement);

  return sqlCommentRemoved;
}

export function classifyStatement(sqlStatement) {
  if (sqlStatement.trim().length === 0) {
    return {
      type: "UNKNOWN",
    };
  }

  const sqlStatementType = sqlStatement.trim().split(/\s+/)[0].toUpperCase();

  return {
    type: sqlStatementType,
  };
}

export function sqlScanner(sqlStatement) {
  let scannedSql = "";
  let insideSingleQuote = false;
  let counter = 0;
  for (let i = 0; i < sqlStatement.length; i++) {
    if (
      !insideSingleQuote &&
      sqlStatement[i] === "-" &&
      sqlStatement[i + 1] === "-" &&
      /[\s\u0000-\u001F]/.test(sqlStatement[i + 2] ?? "")
    ) {
      while (i < sqlStatement.length && sqlStatement[i] !== "\n") {
        i++;
      }
      if(i === sqlStatement.length){
        break
      }
    }

    if (sqlStatement[i] === "'" && counter === 0) {
      insideSingleQuote = true;
      counter = 1;
    } else if (sqlStatement[i] === "'" && counter === 1) {
      if (sqlStatement[i + 1] === "'") {
        insideSingleQuote = true;
        scannedSql += "''";
        i++;
        continue;
      } else {
        insideSingleQuote = false;
        counter = 0;
      }
    }

    scannedSql += sqlStatement[i];
  }

  return scannedSql;
}

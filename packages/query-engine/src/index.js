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
import React, { useState } from "react";
import EditorTabs from "./EditorTabs";
import EditorToolbar from "./EditorToolbar";
import { SQL_KEYWORDS } from "../SQL Tokens/sql_keywords.js";

const EditorWindow = () => {
  const [query, setQuery] = useState("");

  let splitQuery = query.split("\n");

  const sql_tokens =
    query.match(
      /(\s+|`(?:``|[^`])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|(?:>=|<=|<>|!=|=|>|<|\+|-|\*|\/|%)|[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|[^\s])/g,
    ) || [];

  const SQL_KEYWORD_SET = new Set(SQL_KEYWORDS);
  const SQL_KEYWORDS_INFO = sql_tokens.map((token) => {
    const isKeyword = SQL_KEYWORD_SET.has(token.toUpperCase());
    const isNumber = /^\d+$/.test(token);
    const isString = /^(['"])(?:\\.|(?!\1)[^\\])*\1$/.test(token);
    const isOperator = /^(?:>=|<=|<>|!=|=|>|<|\+|-|\*|\/|%)$/.test(token)
    const isComment = /^(?:--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)$/.test(token)
    const isBackTickIdentifier = /^`(?:``|[^`])*`$/.test(token)
    const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)
    const isPunctuation = /^[;,().]$/.test(token)
    return {
      token: token,
      isKeyword: isKeyword,
      isNumber: isNumber,
      isString: isString,
      isOperator: isOperator,
      isComment: isComment,
      isBackTickIdentifier: isBackTickIdentifier,
      isIdentifier: isIdentifier,
      isPunctuation: isPunctuation
    };
  });

  return (
    <div className="w-full h-[60vh] bg-ql-code rounded-lg border border-ql-line flex flex-col overflow-hidden">
      <EditorTabs />
      <EditorToolbar />

      <div className="w-full h-full lg:p-4.5 flex gap-3">
        <div>
          {splitQuery.map((singleLine, index) => (
            <div key={index} className="">
              <p className="text-xl mr-auto text-ql-fg-muted">{index + 1}.</p>
            </div>
          ))}
        </div>

        <div className="w-full relative font-mono">
          <pre className="absolute w-full h-full bg-transparent outline-none text-xl pointer-events-none">
            {SQL_KEYWORDS_INFO.map((keywords, index) => {
              if (keywords.isKeyword) {
                return (
                  <span key={index} className="text-[#569cd6]">
                    {keywords.token}
                  </span>
                );
              } else if (keywords.isNumber) {
                return (
                  <span key={index} className="text-[#b5cea8]">
                    {keywords.token}
                  </span>
                );
              } else if (keywords.isString) {
                return (
                  <span key={index} className="text-[#ce9178]">
                    {keywords.token}
                  </span>
                );
              }
              else if(keywords.isOperator){
                return (
                  <span key={index} className="text-[#dcdcaa]">
                    {keywords.token}
                  </span>
                );
              } 
              else if(keywords.isComment){
                return (
                  <span key={index} className="text-[#6a9955]">
                    {keywords.token}
                  </span>
                );
              }
              else if(keywords.isBackTickIdentifier){
                return (
                  <span key={index} className="text-[#9cdcfe]">
                    {keywords.token}
                  </span>
                );
              } 
              else if(keywords.isIdentifier){
                return (
                  <span key={index} className="text-[#9cdcfe]">
                    {keywords.token}
                  </span>
                );
              } 
              else if(keywords.isPunctuation){
                return (
                  <span key={index} className="text-[#d4d4d4]">
                    {keywords.token}
                  </span>
                );
              } 
              else {
                return (
                  <span key={index} className="text-[#d4d4d4]">
                    {keywords.token}
                  </span>
                );
              }
            })}
          </pre>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-full relative resize-none bg-transparent outline-none text-xl z-100 text-transparent caret-white
         placeholder:text-ql-fg-muted"
            name="textarea"
            id="textarea"
            placeholder="Write your SQL Query here..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default EditorWindow;

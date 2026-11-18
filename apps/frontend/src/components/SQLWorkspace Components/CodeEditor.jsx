import React, { useRef, useState } from "react";
import { SQL_KEYWORDS } from "../SQL Tokens/sql_keywords.js";
import { useLayoutEffect } from "react";

const CodeEditor = ({ activeTabData, updateActiveTabQuery }) => {
  const [rows, setRows] = useState(1);

  const textAreaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumbersRef = useRef(null);

  let splitQuery = activeTabData.sqlQuery.split("\n");

  // Sql_tokens is used to extract every word written in the input so that we can do the tokenization
  const sql_tokens =
    activeTabData.sqlQuery.match(
      /(\s+|`(?:``|[^`])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|(?:>=|<=|<>|!=|=|>|<|\+|-|\*|\/|%)|[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|[^\s])/g,
    ) || [];

  // Tokenization of every word by matching with regex pattern  
  const SQL_KEYWORD_SET = new Set(SQL_KEYWORDS);
  const SQL_KEYWORDS_INFO = sql_tokens.map((token) => {
    const isKeyword = SQL_KEYWORD_SET.has(token.toUpperCase());
    const isNumber = /^\d+$/.test(token);
    const isString = /^(['"])(?:\\.|(?!\1)[^\\])*\1$/.test(token);
    const isOperator = /^(?:>=|<=|<>|!=|=|>|<|\+|-|\*|\/|%)$/.test(token);
    const isComment = /^(?:--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)$/.test(token);
    const isBackTickIdentifier = /^`(?:``|[^`])*`$/.test(token);
    const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token);
    const isPunctuation = /^[;,().]$/.test(token);
    return {
      token: token,
      isKeyword: isKeyword,
      isNumber: isNumber,
      isString: isString,
      isOperator: isOperator,
      isComment: isComment,
      isBackTickIdentifier: isBackTickIdentifier,
      isIdentifier: isIdentifier,
      isPunctuation: isPunctuation,
    };
  });

  // Following functions synchronize the textarea scroll with the "pre overlay" scroll
  const onScrollHandler = (e) => {
    preRef.current.scrollTop = textAreaRef.current.scrollTop;
    preRef.current.scrollLeft = textAreaRef.current.scrollLeft;

    lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
    lineNumbersRef.current.scrollLeft = textAreaRef.current.scrollLeft;
  };

  // Synchronize the line numbers too along with pre overlay
  useLayoutEffect(() => {
    preRef.current.scrollTop = textAreaRef.current.scrollTop;
    preRef.current.scrollLeft = textAreaRef.current.scrollLeft;

    lineNumbersRef.current.scrollTop = textAreaRef.current.scrollTop;
    lineNumbersRef.current.scrollLeft = textAreaRef.current.scrollLeft;
  }, [activeTabData.sqlQuery]);

  // Synchorizes the line height of the numbered rows 
  useLayoutEffect(() => {
    setRows(Math.round((preRef.current.scrollHeight - 20) / 28) || 1);
  }, [activeTabData.sqlQuery]);

  return (
    <div className="w-full lg:p-4.5 flex flex-1 gap-3">
      <div
        className="font-mono text-xl leading-7 shrink-0"
        ref={lineNumbersRef}
      >
        {/* sql code editor numbering */}
        {Array.from({ length: Math.max(rows, splitQuery.length) }, (_, i) => (
          <p key={i} className="text-ql-fg-muted">
            {i + 1}.
          </p>
        ))}
      </div>

      <div className="w-full relative font-mono flex-1 min-w-0">
        <pre
          ref={(element) => {
            preRef.current = element;
          }}
          className="w-full min-w-0 bg-transparent outline-none text-xl pointer-events-none whitespace-pre-wrap leading-7 pb-5 wrap-break-word m-0 box-border"
        >
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
            } else if (keywords.isOperator) {
              return (
                <span key={index} className="text-[#dcdcaa]">
                  {keywords.token}
                </span>
              );
            } else if (keywords.isComment) {
              return (
                <span key={index} className="text-[#6a9955]">
                  {keywords.token}
                </span>
              );
            } else if (keywords.isBackTickIdentifier) {
              return (
                <span key={index} className="text-[#9cdcfe]">
                  {keywords.token}
                </span>
              );
            } else if (keywords.isIdentifier) {
              return (
                <span key={index} className="text-[#9cdcfe]">
                  {keywords.token}
                </span>
              );
            } else if (keywords.isPunctuation) {
              return (
                <span key={index} className="text-[#d4d4d4]">
                  {keywords.token}
                </span>
              );
            } else {
              return (
                <span key={index} className="text-[#d4d4d4]">
                  {keywords.token}
                </span>
              );
            }
          })}
        </pre>

        <textarea
          onScroll={(e) => onScrollHandler(e)}
          wrap="soft"
          ref={textAreaRef}
          value={activeTabData.sqlQuery}
          onChange={(e) => updateActiveTabQuery(e.target.value)}
          className="absolute inset-0 resize-none bg-transparent outline-none text-xl z-100 text-transparent font-mono box-border caret-white w-full h-full
         placeholder:text-ql-fg-muted leading-7 p-0 m-0 wrap-break-word scrollbar-none [&::-webkit-scrollbar]:hidden"
          name="textarea"
          id="textarea"
          placeholder="Write your SQL Query here..."
        ></textarea>
      </div>
    </div>
  );
};

export default CodeEditor;

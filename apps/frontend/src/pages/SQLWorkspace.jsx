import React from "react";
import TitleBar from "../components/TitleBar";
import EditorWindow from "../components/SQLWorkspace Components/EditorWindow";

const SQLWorkspace = () => {
  return (
    <div className="w-full min-h-[95.6vh]">
      <TitleBar />

      <div className="lg:p-5 flex flex-col gap-7">
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold">SQL Workspace</p>
          <p className="text-md">
            Write, execute and analyze your SQL queries with powerful insights.
          </p>
        </div>

        <div className="flex items-stretch">
          <EditorWindow/>
        </div>

      </div>
    </div>
  );
};

export default SQLWorkspace;

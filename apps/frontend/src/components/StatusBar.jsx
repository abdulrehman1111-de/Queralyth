import React from "react";
import { Database, Server, Bell } from "lucide-react";

const StatusBar = () => {
  return (
    <div className="w-full h-7 shrink-0 lg:p-1.5 border border-ql-line flex justify-between items-center bg-ql-code">
      <div className="flex items-center gap-3 px-2">
        <div className="flex gap-1">
          <Database
            className="lg:w-4 lg:h-4 shrink-0 text-ql-fg-muted
            "
          />
          <p className="text-xs text-ql-fg-secondary">Production DB</p>
        </div>
        <div className="flex gap-1">
          <Server
            className="lg:w-4 lg:h-4 shrink-0 text-ql-fg-muted
            "
          />
          <p className="text-xs text-ql-fg-secondary">MySQL 8.0</p>
        </div>
        <p className="text-xs text-ql-fg-secondary">Query Engine v0.1.0</p>
      </div>

      <div className="flex gap-3 items-center px-2">
        <div className="flex gap-2 items-center">
          <div className="bg-ql-ok h-2 w-2 rounded-full"></div>
          <p className="text-xs text-ql-fg-secondary">All Systems online</p>
        </div>
        <Bell
          className="lg:w-4 lg:h-4 shrink-0 text-ql-fg-muted
            "
        />
      </div>
    </div>
  );
};

export default StatusBar;

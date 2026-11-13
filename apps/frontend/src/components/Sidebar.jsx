import React from "react";
import {
  Database,
  Terminal,
  History,
  Network,
  ChartNoAxesColumnIncreasing,
  BrainCircuit,
  Settings,
} from "lucide-react";
import Sidebuttons from "./Sidebuttons";
import { NavLink } from "react-router-dom";

const Sidebar = () => {

  const NavlinkFunction = ({to, content, icon: Icon}) =>(
      <NavLink
          to={to}
          className={({ isActive }) =>
            `rounded-lg transition-colors ${
              isActive
                ? "bg-ql-selected text-ql-fg font-semibold"
                : "text-ql-fg-secondary hover:text-ql-fg"
            }`
          }
        >
          {({isActive})=>{
            return <Sidebuttons isActive={isActive} content={content} icon={Icon} />
          }}
        </NavLink>
  )

  return (
    <aside className="border border-ql-line bg-ql-panel h-full overflow-y-auto lg:w-[17%] lg:shrink-0 p-4 pt-5 flex flex-col gap-5">
      <div className="flex lg:gap-2 items-center">
        <Database className="lg:w-5 lg:h-5 shrink-0 text-ql-blue" />
        <p className="font-semibold text-lg text-ql-fg">Queralyth</p>
      </div>

      <div className="w-full h-auto flex flex-col gap-0.5">
        
        <NavlinkFunction to="/" content={"SQL Workspace"} icon={Terminal}/>
        <NavlinkFunction to="/query-history" content={"Query History"} icon={History}/>
        <NavlinkFunction to="/connections" content={"Connections"} icon={Network}/>
        <NavlinkFunction to="/performance" content={"Performance"} icon={ChartNoAxesColumnIncreasing}/>
        <NavlinkFunction to="/insights" content={"Insights"} icon={BrainCircuit}/>
        <NavlinkFunction to="/settings" content={"Settings"} icon={Settings}/>
      </div>
    </aside>
  );
};

export default Sidebar;

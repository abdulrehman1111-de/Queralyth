import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StatusBar from "../components/StatusBar"
import React from "react";

const DashboardLayout = () => {
  return (
    <div className="flex flex-col">
      <div className="flex">
        <Sidebar />

        <Outlet />
      </div>

        <StatusBar/>
    </div>
  );
};

export default DashboardLayout;

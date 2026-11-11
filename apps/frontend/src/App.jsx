import { Route, Routes } from "react-router-dom";
import SQLWorkspace from "./pages/SQLWorkspace";
import DashboardLayout from "./pages/DashboardLayout";
import Connections from "./pages/Connections";
import Insights from "./pages/Insights";
import QueryHistory from "./pages/QueryHistory";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<DashboardLayout/>}>
        <Route index element={<SQLWorkspace/>}/>
        <Route path="connections" element={<Connections/>}/>
        <Route path="insights" element={<Insights/>}/>
        <Route path="performance" element={<Performance/>}/>
        <Route path="query-history" element={<QueryHistory/>}/>
        <Route path="settings" element={<Settings/>}/>
      </Route>
    </Routes>
    </>
  );
}

export default App;

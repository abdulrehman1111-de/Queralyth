import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import SQLWorkspace from "./pages/SQLWorkspace";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex">
        <Sidebar />
        <SQLWorkspace />
      </div>
      <Footer/>
    </div>
  );
}

export default App;

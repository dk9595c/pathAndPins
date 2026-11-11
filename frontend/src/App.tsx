import { ThemeToggle } from "./components/ThemeToggle";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { Planner } from "./pages/Planner";
import NotFound from "./pages/NotFound";
import Header from "./components/Header/Header";
import { ToastContainer } from "react-toastify";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ThemeToggle />
      <ToastContainer position="top-center" autoClose={3000} />
    </Router>
  );
}

export default App;

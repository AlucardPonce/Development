import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./layouts/pages/LandingPage";
import LoginPage from "./layouts/pages/LoginPage";
import DashboardPage from "./layouts/pages/Dashboard/DashboardPage";
import RegisterPage from "./layouts/pages/register";
import GroupManagementPage from "./layouts/pages/GroupManagementPage";
import UserManagementPage from "./layouts/pages/UserManagementPage";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/group" element={<GroupManagementPage />} />
        {/* Nueva ruta para la administración de usuarios */}
        <Route path="/admin/users" element={<UserManagementPage />} />
      </Routes>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

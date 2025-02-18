import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Bienvenido Task Manager</h1>
      <Button type="primary" onClick={() => navigate("/login")}>
        Iniciar sesión
      </Button>
    </div>
  );
};

export default LandingPage;
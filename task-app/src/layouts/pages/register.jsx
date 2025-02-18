import { Form, Input, Button, Card, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(""); 
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setFormError(""); 

    const { username, password, gmail, rol } = values;
    const last_login = new Date().toISOString(); // Obtener la fecha y hora actual

    const payload = {
      username,
      password,
      gmail,
      last_login,
      rol,
    };

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error al registrar el usuario");
      }

      const result = await response.json();
      message.success("Registro exitoso");
      navigate("/login"); // Redirigir al login después de un registro exitoso
    } catch (error) {
      setFormError(error.message || "Ocurrió un error al registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Card style={styles.card} bordered={false}>
        <Title level={2} style={{ textAlign: "center", color: "#333" }}>
          Crear Cuenta
        </Title>
        
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Usuario"
            name="username"
            rules={[{ required: true, message: "Por favor, ingrese su usuario" }]}
            validateStatus={formError ? "error" : ""}
            help={formError && formError}
          >
            <Input placeholder="Usuario" />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[
              { required: true, message: "Ingrese su contraseña" },
              { min: 6, message: "Debe tener al menos 6 caracteres" },
            ]}
            validateStatus={formError ? "error" : ""}
            help={formError && formError}
          >
            <Input.Password placeholder="Contraseña" />
          </Form.Item>

          <Form.Item
            label="Correo Electrónico"
            name="gmail"
            rules={[{ required: true, message: "Por favor, ingrese su correo electrónico" }]}
            validateStatus={formError ? "error" : ""}
            help={formError && formError}
          >
            <Input placeholder="Correo electrónico" />
          </Form.Item>

          <Form.Item
            label="Rol"
            name="rol"
            rules={[{ required: true, message: "Por favor, seleccione su rol" }]}
            validateStatus={formError ? "error" : ""}
            help={formError && formError}
          >
            <Input placeholder="Rol" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={styles.button}
            >
              Registrar
            </Button>
          </Form.Item>
        </Form>
        <p>
          ¿Ya tienes cuenta? 
          <Button 
            type="link" 
            onClick={() => navigate("/login")}
            style={{ padding: 0, fontSize: "14px" }}
          >
            Iniciar sesión
          </Button>
        </p>
      </Card>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea, #764ba2)", 
  },
  card: {
    width: 380,
    padding: 20,
    borderRadius: 10,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
    background: "#fff",
  },
  button: {
    backgroundColor: "#1890ff",
    borderColor: "#1890ff",
    fontSize: "16px",
  },
  errorMessage: {
    color: "#f5222d",
    marginBottom: "10px",
    fontSize: "14px",
    textAlign: "center",
  },
};

export default RegisterPage;

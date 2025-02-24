import axios from "axios";
import { message } from "antd";
import { useNavigate } from "react-router-dom";

// Crear una instancia de axios
const api = axios.create({
    baseURL: "http://localhost:3000", // URL base del backend
});

// Interceptor de respuestas
api.interceptors.response.use(
    (response) => {
        // Si la respuesta es exitosa, simplemente la retornamos
        return response;
    },
    (error) => {
        // Si hay un error en la respuesta
        if (error.response && error.response.status === 440) {
            // Token expirado
            message.error("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");

            // Eliminar el token del localStorage
            localStorage.removeItem("token");

            // Redirigir al usuario a la página de inicio de sesión
            const navigate = useNavigate();
            navigate("/login");
        }

        // Retornar el error para que pueda ser manejado en el componente
        return Promise.reject(error);
    }
);

export default api;
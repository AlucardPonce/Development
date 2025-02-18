import React, { useState } from 'react';
import axios from 'axios';

const Registro = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        gmail: '',
        last_login: '',
        rol: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Realiza la solicitud POST al backend
            const response = await axios.post('http://localhost:3000/register', formData);
            console.log(response.data);
            alert('Usuario registrado con éxito');
        } catch (error) {
            console.error('Error registrando el usuario:', error);
            alert('Hubo un error al registrar al usuario');
        }
    };

    return (
        <div className="registro-container">
            <h2>Formulario de Registro</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="gmail">Gmail</label>
                    <input
                        type="email"
                        id="gmail"
                        name="gmail"
                        value={formData.gmail}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="last_login">Last Login</label>
                    <input
                        type="date"
                        id="last_login"
                        name="last_login"
                        value={formData.last_login}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="rol">Rol</label>
                    <select
                        id="rol"
                        name="rol"
                        value={formData.rol}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Seleccione un rol</option>
                        <option value="admin">Admin</option>
                        <option value="user">Usuario</option>
                    </select>
                </div>
                <button type="submit">Registrar</button>
            </form>
        </div>
    );
};

export default Registro;

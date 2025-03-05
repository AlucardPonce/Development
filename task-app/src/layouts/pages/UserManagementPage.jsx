import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, message } from 'antd';
import axios from 'axios';
import MainLayout from '../../layouts/MainLayout';
import api from "../utility/api";

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [visible, setVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [roles, setRoles] = useState(['worker', 'managment_task', 'admin']); // Roles disponibles
    const userToken = localStorage.getItem('token');

    // Obtener la lista de usuarios
    const fetchUsers = async () => {
        try {
            const response = await axios.get('https://development-iyl1.onrender.com/users', {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            message.error('Error al obtener usuarios');
        }
    };

    // Eliminar un usuario
    const handleDeleteUser = async (userId) => {
        try {
            await axios.delete(`https://development-iyl1.onrender.com/users/${userId}/delete`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            message.success('Usuario eliminado con éxito');
            fetchUsers(); // Actualizar la lista de usuarios
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            message.error('Error al eliminar usuario');
        }
    };

    // Asignar un rol a un usuario
    const handleAssignRole = async (values) => {
        try {
            await axios.post(
                `https://development-iyl1.onrender.com/users/${selectedUser.id}/assign-role`,
                { roleId: values.role }, // Asegúrate de que values.role sea "worker", "managment_task" o "admin"
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );
            message.success('Rol asignado con éxito');
            setVisible(false); // Cerrar el modal
            fetchUsers(); // Actualizar la lista de usuarios
        } catch (error) {
            console.error('Error al asignar rol:', error.response ? error.response.data : error.message);
            message.error('Error al asignar rol');
        }
    };
    // Abrir el modal para asignar rol
    const openAssignRoleModal = (user) => {
        setSelectedUser(user);
        setVisible(true);
    };

    // Cerrar el modal
    const handleCancel = () => {
        setVisible(false);
        setSelectedUser(null);
    };

    // Obtener datos iniciales
    useEffect(() => {
        fetchUsers();
    }, []);

    // Columnas de la tabla
    const columns = [
        {
            title: 'Nombre de Usuario',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Correo Electrónico',
            dataIndex: 'gmail',
            key: 'gmail',
        },
        {
            title: 'Rol',
            dataIndex: 'rol',
            key: 'rol',
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, user) => (
                <div>
                    <Button
                        type="primary"
                        onClick={() => openAssignRoleModal(user)}
                        style={{ marginRight: 8 }}
                    >
                        Asignar Rol
                    </Button>
                    <Button
                        type="danger"
                        onClick={() => handleDeleteUser(user.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <MainLayout>
            <h1>Administración de Usuarios</h1>
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />

            {/* Modal para asignar rol */}
            <Modal
                title="Asignar Rol"
                visible={visible}
                onCancel={handleCancel}
                footer={null}
            >
                <Form onFinish={handleAssignRole}>
                    <Form.Item
                        name="role"
                        label="Selecciona un Rol"
                        rules={[{ required: true, message: 'Por favor selecciona un rol' }]}
                    >
                        <Select placeholder="Selecciona un rol">
                            {roles.map((role) => (
                                <Select.Option key={role} value={role}>
                                    {role}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Asignar Rol
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </MainLayout>
    );
};

export default UserManagementPage;
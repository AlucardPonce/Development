import React, { useEffect, useState } from 'react';
import { Button, Select, Input, message, Modal, Form } from 'antd';
import axios from 'axios';
import MainLayout from "../../layouts/MainLayout"; // Asegúrate de que este componente esté disponible

const GroupManagementPage = () => {
    const [groups, setGroups] = useState([]); // Estado para grupos
    const [selectedGroupId, setSelectedGroupId] = useState(null); // Grupo seleccionado
    const [visible, setVisible] = useState(false);
    const userToken = localStorage.getItem('token'); // Asegúrate de obtener el token de la forma correcta
    const [tasks, setTasks] = useState([]); // Estado para tareas

    const fetchGroups = async () => {
        try {
            const response = await axios.get('http://localhost:3000/groups', {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            setGroups(response.data.groups);
        } catch (error) {
            console.error('Error al obtener grupos:', error);
        }
    };

    const fetchTasks = async (groupId) => {
        try {
            const response = await axios.get(`http://localhost:3000/groups/${groupId}/tasks`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            setTasks(response.data.tasks);
        } catch (error) {
            console.error('Error al obtener tareas:', error);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []); // Dependencia vacía para ejecutar solo al montar el componente

    const onCreateTask = async (values) => {
      try {
        const token = localStorage.getItem('token'); // o donde sea que guardes tu token
        const response = await axios.post(
          `http://localhost:3000/groups/${selectedGroupId}/tasks`,
          {
            name: values.name_task,
            description: values.description,
            status: values.status,
            // Incluye otros campos que necesites
          },
          {
            headers: {
              Authorization: `Bearer ${token}`, // Agrega el token aquí
            },
          }
        );
        console.log('Tarea creada:', response.data);
      } catch (error) {
        console.error('Error al crear la tarea:', error.response ? error.response.data : error.message);
      }
    };
    
    

    const handleAddMember = async (username, role) => {
        try {
            await axios.post(`http://localhost:3000/groups/${selectedGroupId}/add-user`, { username, role }, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            message.success('Usuario agregado con éxito');
        } catch (error) {
            console.error('Error al agregar usuario:', error);
            message.error('Error al agregar usuario');
        }
    };

    return (
        <MainLayout>
            <Select
                style={{ width: 200, marginBottom: 20 }}
                placeholder="Selecciona un grupo"
                onChange={(value) => {
                    setSelectedGroupId(value);
                    fetchTasks(value); // Obtener tareas del grupo seleccionado
                }}
            >
                {groups.map(group => (
                    <Select.Option key={group.id} value={group.id}>
                        {group.name}
                    </Select.Option>
                ))}
            </Select>

            <Button onClick={() => setVisible(true)}>Crear Tarea</Button>

            <Modal
                title="Crear Tarea"
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={null}
            >
                <Form onFinish={onCreateTask}>
                    <Form.Item name="name_task" label="Nombre de la Tarea" rules={[{ required: true, message: 'Por favor ingresa el nombre de la tarea' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Descripción">
                        <Input.TextArea />
                    </Form.Item>
                    <Form.Item name="status" label="Estado" initialValue="pendiente">
                        <Select>
                            <Select.Option value="pendiente">Pendiente</Select.Option>
                            <Select.Option value="en progreso">En Progreso</Select.Option>
                            <Select.Option value="completado">Completado</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Crear Tarea
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {selectedGroupId && (
                <AddMemberForm groupId={selectedGroupId} onAddMember={handleAddMember} />
            )}
        </MainLayout>
    );
};

const AddMemberForm = ({ groupId, onAddMember }) => {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('');

    const handleAdd = () => {
        if (username && role) {
            onAddMember(username, role);
            setUsername('');
            setRole('');
        } else {
            message.error('Por favor ingresa un nombre de usuario y selecciona un rol');
        }
    };

    return (
        <div style={{ marginTop: 20 }}>
            <h3>Agregar Miembro al Grupo</h3>
            <Input
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ marginBottom: 10 }}
            />
            <Select
                placeholder="Selecciona un rol"
                onChange={(value) => setRole(value)}
                style={{ marginBottom: 10, width: 200 }}
            >
                <Select.Option value="admin">Admin</Select.Option>
                <Select.Option value="member">Miembro</Select.Option>
                {/* Otros roles según sea necesario */}
            </Select>
            <Button onClick={handleAdd}>Agregar Miembro</Button>
        </div>
    );
};

export default GroupManagementPage;

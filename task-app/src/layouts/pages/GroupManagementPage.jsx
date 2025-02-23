import React, { useEffect, useState } from 'react';
import { Button, Select, Input, message, Modal, Form, List } from 'antd';
import axios from 'axios';
import MainLayout from "../../layouts/MainLayout";

const GroupManagementPage = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [visible, setVisible] = useState(false);
    const [visibleGroupModal, setVisibleGroupModal] = useState(false);
    const userToken = localStorage.getItem('token');
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);

    // Obtener la lista de grupos
    const fetchGroups = async () => {
        try {
            const response = await axios.get('http://localhost:3000/user/groups', {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            setGroups(response.data.groups);
        } catch (error) {
            console.error('Error al obtener grupos:', error);
        }
    };

    // Obtener la lista de tareas de un grupo
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

    // Obtener la lista de usuarios
    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:3000/users', {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
        }
    };

    // Crear una tarea
    const onCreateTask = async (values) => {
        try {
            const response = await axios.post(
                `http://localhost:3000/groups/${selectedGroupId}/tasks`,
                {
                    category: values.category,
                    description: values.description,
                    name_task: values.name_task,
                    status: values.status,
                    time_until_finish: values.time_until_finish,
                    remind_me: values.remind_me,
                    assignedTo: values.assignedTo,
                },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );
            message.success('Tarea creada con éxito');
            fetchTasks(selectedGroupId); // Actualizar la lista de tareas
            setVisible(false); // Cerrar el modal
        } catch (error) {
            console.error('Error al crear la tarea:', error.response ? error.response.data : error.message);
            message.error('Error al crear la tarea');
        }
    };

    // Crear un grupo
    const onCreateGroup = async (values) => {
        try {
            const response = await axios.post(
                'http://localhost:3000/groups',
                {
                    name: values.groupName,
                    description: values.description,
                },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );
            message.success('Grupo creado con éxito');
            setVisibleGroupModal(false);
            fetchGroups(); // Actualizar la lista de grupos
        } catch (error) {
            console.error('Error al crear el grupo:', error.response ? error.response.data : error.message);
            message.error('Error al crear el grupo');
        }
    };

    // Agregar un miembro a un grupo
    const handleAddMember = async (username) => {
        try {
            await axios.post(
                `http://localhost:3000/groups/${selectedGroupId}/add-member`,
                { usernameToAdd: username },
                {
                    headers: { Authorization: `Bearer ${userToken}` },
                }
            );
            message.success('Usuario agregado con éxito');
        } catch (error) {
            console.error('Error al agregar usuario:', error);
            message.error('Error al agregar usuario');
        }
    };

    // Obtener datos iniciales
    useEffect(() => {
        fetchGroups();
        fetchUsers();
    }, []);

    return (
        <MainLayout>
            {/* Botón para crear un grupo */}
            <Button onClick={() => setVisibleGroupModal(true)}>Crear Grupo</Button>

            {/* Seleccionar un grupo */}
            <Select
                style={{ width: 200, marginBottom: 20 }}
                placeholder="Selecciona un grupo"
                onChange={(value) => {
                    setSelectedGroupId(value);
                    fetchTasks(value);
                }}
            >
                {groups.map(group => (
                    <Select.Option key={group.id} value={group.id}>
                        {group.name}
                    </Select.Option>
                ))}
            </Select>

            {/* Botón para crear una tarea */}
            <Button onClick={() => setVisible(true)}>Crear Tarea</Button>

            {/* Modal para crear una tarea */}
            <Modal
                title="Crear Tarea"
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={null}
            >
                <Form onFinish={onCreateTask}>
                    {/* Nombre de la Tarea */}
                    <Form.Item
                        name="name_task"
                        label="Nombre de la Tarea"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>

                    {/* Descripción de la Tarea */}
                    <Form.Item
                        name="description"
                        label="Descripción"
                        rules={[{ required: true, message: 'Por favor ingresa la descripción de la tarea' }]}
                    >
                        <Input.TextArea />
                    </Form.Item>

                    {/* Categoría de la Tarea */}
                    <Form.Item
                        name="category"
                        label="Categoría"
                        rules={[{ required: true, message: 'Por favor ingresa la categoría de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>

                    {/* Estado de la Tarea */}
                    <Form.Item
                        name="status"
                        label="Estado"
                        initialValue="pendiente"
                        rules={[{ required: true, message: 'Por favor selecciona un estado' }]}
                    >
                        <Select>
                            <Select.Option value="pendiente">Pendiente</Select.Option>
                            <Select.Option value="en progreso">En Progreso</Select.Option>
                            <Select.Option value="completado">Completado</Select.Option>
                        </Select>
                    </Form.Item>

                    {/* Fecha Límite */}
                    <Form.Item
                        name="time_until_finish"
                        label="Fecha Límite"
                        rules={[{ required: true, message: 'Por favor ingresa la fecha límite' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>

                    {/* Recordatorio */}
                    <Form.Item
                        name="remind_me"
                        label="Recordatorio"
                        rules={[{ required: true, message: 'Por favor ingresa el recordatorio' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>

                    {/* Asignar a un Usuario */}
                    <Form.Item
                        name="assignedTo"
                        label="Asignar a"
                        rules={[{ required: true, message: 'Por favor selecciona un usuario' }]}
                    >
                        <Select placeholder="Selecciona un usuario">
                            {users.map(user => (
                                <Select.Option key={user.username} value={user.username}>
                                    {user.username}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Botón de Envío */}
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Crear Tarea
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal para crear un grupo */}
            <Modal
                title="Crear Grupo"
                visible={visibleGroupModal}
                onCancel={() => setVisibleGroupModal(false)}
                footer={null}
            >
                <Form onFinish={onCreateGroup}>
                    <Form.Item
                        name="groupName"
                        label="Nombre del Grupo"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre del grupo' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Descripción del Grupo"
                        rules={[{ required: true, message: 'Por favor ingresa la descripción del grupo' }]}
                    >
                        <Input.TextArea />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Crear Grupo
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Formulario para agregar miembros */}
            {selectedGroupId && (
                <AddMemberForm groupId={selectedGroupId} onAddMember={handleAddMember} />
            )}

            {/* Lista de tareas del grupo seleccionado */}
            {tasks.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <h3>Tareas del Grupo</h3>
                    <List
                        bordered
                        dataSource={tasks}
                        renderItem={task => (
                            <List.Item>
                                <div>
                                    <strong>Nombre de la Tarea:</strong> {task.name_task} <br />
                                    <strong>Descripción:</strong> {task.description} <br />
                                    <strong>Categoría:</strong> {task.category} <br />
                                    <strong>Estado:</strong> {task.status} <br />
                                    <strong>Fecha de Creación:</strong> {new Date(task.timestamp).toLocaleString()} <br />
                                    <strong>Fecha Límite:</strong> {task.time_until_finish} <br />
                                    <strong>Recordatorio:</strong> {task.remind_me} <br />
                                    <strong>Asignado a:</strong> {task.assignedTo} <br />
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            )}
        </MainLayout>
    );
};

// Componente para agregar miembros a un grupo
const AddMemberForm = ({ groupId, onAddMember }) => {
    const [username, setUsername] = useState('');

    const handleAdd = () => {
        if (username) {
            onAddMember(username);
            setUsername('');
        } else {
            message.error('Por favor ingresa un nombre de usuario');
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
            <Button onClick={handleAdd}>Agregar Miembro</Button>
        </div>
    );
};

export default GroupManagementPage;
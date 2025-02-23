import React, { useEffect, useState } from 'react';
import { Button, Select, Input, message, Modal, Form, List } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import MainLayout from "../../layouts/MainLayout";

const GroupManagementPage = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [visible, setVisible] = useState(false);
    const [visibleGroupModal, setVisibleGroupModal] = useState(false);
    const [visibleEditModal, setVisibleEditModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
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

    // Editar una tarea
    const onEditTask = async (values) => {
        try {
            const response = await axios.put(
                `http://localhost:3000/tasks/update/${editingTask.id}`,
                {
                    ...values,
                    time_until_finish: values.time_until_finish,
                    remind_me: values.remind_me,
                },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );

            message.success('Tarea actualizada con éxito');
            fetchTasks(selectedGroupId); // Actualizar la lista de tareas
            setVisibleEditModal(false); // Cerrar el modal de edición
        } catch (error) {
            console.error('Error al actualizar la tarea:', error.response ? error.response.data : error.message);
            message.error('Error al actualizar la tarea');
        }
    };

    // Eliminar una tarea
    const onDeleteTask = async (taskId) => {
        try {
            await axios.delete(`http://localhost:3000/tasks/${taskId}/delete`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });
            message.success('Tarea eliminada con éxito');
            fetchTasks(selectedGroupId); // Actualizar la lista de tareas
        } catch (error) {
            console.error('Error al eliminar la tarea:', error.response ? error.response.data : error.message);
            message.error('Error al eliminar la tarea');
        }
    };

    // Cambiar el estado de una tarea
    const onChangeStatus = async (taskId, newStatus) => {
        try {
            await axios.put(
                `http://localhost:3000/tasks/update/${taskId}`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );
            message.success('Estado de la tarea actualizado con éxito');
            fetchTasks(selectedGroupId); // Actualizar la lista de tareas
        } catch (error) {
            console.error('Error al actualizar el estado:', error.response ? error.response.data : error.message);
            message.error('Error al actualizar el estado');
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
            setVisibleGroupModal(false); // Cerrar el modal
            fetchGroups(); // Actualizar la lista de grupos
        } catch (error) {
            console.error('Error al crear el grupo:', error.response ? error.response.data : error.message);
            message.error('Error al crear el grupo');
        }
    };

    // Agregar un miembro al grupo
    const handleAddMember = async (username) => {
        try {
            const response = await axios.post(
                `http://localhost:3000/groups/${selectedGroupId}/add-member`,
                { usernameToAdd: username },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );

            message.success('Usuario agregado con éxito');
            fetchGroups(); // Actualizar la lista de grupos
        } catch (error) {
            console.error('Error al agregar usuario:', error.response ? error.response.data : error.message);
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
                    <Form.Item
                        name="name_task"
                        label="Nombre de la Tarea"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Descripción"
                        rules={[{ required: true, message: 'Por favor ingresa la descripción de la tarea' }]}
                    >
                        <Input.TextArea />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="Categoría"
                        rules={[{ required: true, message: 'Por favor ingresa la categoría de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>
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
                    <Form.Item
                        name="time_until_finish"
                        label="Fecha Límite"
                        rules={[{ required: true, message: 'Por favor ingresa la fecha límite' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>
                    <Form.Item
                        name="remind_me"
                        label="Recordatorio"
                        rules={[{ required: true, message: 'Por favor ingresa el recordatorio' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>
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
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Crear Tarea
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal para editar una tarea */}
            <Modal
                title="Editar Tarea"
                visible={visibleEditModal}
                onCancel={() => setVisibleEditModal(false)}
                footer={null}
            >
                <Form
                    initialValues={{
                        ...editingTask,
                        time_until_finish: editingTask?.time_until_finish,
                        remind_me: editingTask?.remind_me,
                    }}
                    onFinish={onEditTask}
                >
                    <Form.Item
                        name="name_task"
                        label="Nombre de la Tarea"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Descripción"
                        rules={[{ required: true, message: 'Por favor ingresa la descripción de la tarea' }]}
                    >
                        <Input.TextArea />
                    </Form.Item>
                    <Form.Item
                        name="category"
                        label="Categoría"
                        rules={[{ required: true, message: 'Por favor ingresa la categoría de la tarea' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="Estado"
                        rules={[{ required: true, message: 'Por favor selecciona un estado' }]}
                    >
                        <Select>
                            <Select.Option value="pendiente">Pendiente</Select.Option>
                            <Select.Option value="en progreso">En Progreso</Select.Option>
                            <Select.Option value="completado">Completado</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="time_until_finish"
                        label="Fecha Límite"
                        rules={[{ required: true, message: 'Por favor ingresa la fecha límite' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>
                    <Form.Item
                        name="remind_me"
                        label="Recordatorio"
                        rules={[{ required: true, message: 'Por favor ingresa el recordatorio' }]}
                    >
                        <Input type="datetime-local" />
                    </Form.Item>
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
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Actualizar Tarea
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Formulario para agregar miembros */}
            {selectedGroupId && (
                <AddMemberForm groupId={selectedGroupId} onAddMember={handleAddMember} users={users} />
            )}

            {/* Lista de tareas del grupo seleccionado */}
            {tasks.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <h3>Tareas del Grupo</h3>
                    <List
                        bordered
                        dataSource={tasks}
                        renderItem={task => (
                            <List.Item
                                actions={[
                                    <Select
                                        defaultValue={task.status}
                                        style={{ width: 120 }}
                                        onChange={(value) => onChangeStatus(task.id, value)}
                                    >
                                        <Select.Option value="pendiente">Pendiente</Select.Option>
                                        <Select.Option value="en progreso">En Progreso</Select.Option>
                                        <Select.Option value="completado">Completado</Select.Option>
                                    </Select>,
                                    <Button
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setEditingTask(task);
                                            setVisibleEditModal(true);
                                        }}
                                    />,
                                    <Button
                                        icon={<DeleteOutlined />}
                                        onClick={() => onDeleteTask(task.id)}
                                        danger
                                    />,
                                ]}
                            >
                                <List.Item.Meta
                                    title={task.name_task}
                                    description={
                                        <>
                                            <p>{task.description}</p>
                                            <p><strong>Categoría:</strong> {task.category}</p>
                                            <p><strong>Asignado a:</strong> {task.assignedTo}</p>
                                            <p><strong>Fecha Límite:</strong> {task.time_until_finish}</p>
                                            <p><strong>Recordatorio:</strong> {task.remind_me}</p>
                                        </>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                </div>
            )}
        </MainLayout>
    );
};

// Componente para agregar miembros a un grupo
const AddMemberForm = ({ groupId, onAddMember, users }) => {
    const [selectedUser, setSelectedUser] = useState(null);

    const handleAdd = () => {
        if (selectedUser) {
            onAddMember(selectedUser);
            setSelectedUser(null); // Limpiar la selección
        } else {
            message.error('Por favor selecciona un usuario');
        }
    };

    return (
        <div style={{ marginTop: 20 }}>
            <h3>Agregar Miembro al Grupo</h3>
            <Select
                placeholder="Selecciona un usuario"
                style={{ width: 200, marginBottom: 10 }}
                value={selectedUser}
                onChange={(value) => setSelectedUser(value)}
            >
                {users.map(user => (
                    <Select.Option key={user.username} value={user.username}>
                        {user.username}
                    </Select.Option>
                ))}
            </Select>
            <Button onClick={handleAdd}>Agregar Miembro</Button>
        </div>
    );
};

export default GroupManagementPage;
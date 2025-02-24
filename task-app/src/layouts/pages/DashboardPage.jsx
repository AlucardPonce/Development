import React, { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button, message, Select, Tabs, Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import axios from "axios";
import dayjs from "dayjs";

const { TabPane } = Tabs;

const TaskForm = ({ visible, onCreate, onCancel, taskData, groups, users }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (taskData) {
            form.setFieldsValue({
                ...taskData,
                time_until_finish: taskData.time_until_finish ? dayjs(taskData.time_until_finish) : null,
                remind_me: taskData.remind_me ? dayjs(taskData.remind_me) : null,
            });
        } else {
            form.resetFields();
        }
    }, [taskData, visible]);

    const onFinish = (values) => {
        onCreate({
            ...values,
            time_until_finish: values.time_until_finish ? values.time_until_finish.toISOString() : null,
            remind_me: values.remind_me ? values.remind_me.toISOString() : null,
            id: taskData?.id,
        });
        form.resetFields();
    };

    return (
        <Modal
            open={visible}
            title={taskData ? "Editar Tarea" : "Crear Tarea"}
            okText={taskData ? "Actualizar" : "Crear"}
            onCancel={onCancel}
            onOk={form.submit}
        >
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="name_task"
                    label="Nombre de la tarea"
                    rules={[{ required: true, message: "Por favor ingresa el nombre de la tarea" }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Descripción"
                    rules={[{ required: true, message: "Por favor ingresa la descripción" }]}
                >
                    <Input.TextArea />
                </Form.Item>
                <Form.Item
                    name="time_until_finish"
                    label="Tiempo hasta terminar"
                    rules={[{ required: true, message: "Por favor selecciona la fecha y hora" }]}
                >
                    <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
                </Form.Item>
                <Form.Item
                    name="remind_me"
                    label="Recordarme"
                    rules={[{ required: true, message: "Por favor selecciona la fecha y hora" }]}
                >
                    <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
                </Form.Item>
                <Form.Item
                    label="Estado"
                    name="status"
                    rules={[{ required: true, message: "Por favor, seleccione un estado" }]}
                >
                    <Select placeholder="Seleccione un estado">
                        <Select.Option value="pendiente">Pendiente</Select.Option>
                        <Select.Option value="en progreso">En Progreso</Select.Option>
                        <Select.Option value="completado">Completado</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item
                    name="category"
                    label="Categoría"
                    rules={[{ required: true, message: "Por favor ingresa la categoría" }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="groupId"
                    label="Grupo"
                    rules={[{ required: true, message: "Por favor selecciona un grupo" }]}
                >
                    <Select placeholder="Seleccione un grupo">
                        {groups.map((group) => (
                            <Select.Option key={group.id} value={group.id}>
                                {group.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    name="assignedTo"
                    label="Asignar a"
                    rules={[{ required: true, message: "Por favor selecciona un usuario" }]}
                >
                    <Select placeholder="Seleccione un usuario">
                        {users.map((user) => (
                            <Select.Option key={user.username} value={user.username}>
                                {user.username}
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

const DashboardPage = () => {
    const [visible, setVisible] = useState(false);
    const [myTasks, setMyTasks] = useState([]); // Tareas asignadas al usuario
    const [groupTasks, setGroupTasks] = useState([]); // Tareas de los grupos
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [editingTask, setEditingTask] = useState(null); // Estado para la tarea en edición
    const userToken = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    const username = localStorage.getItem("username");

    // Obtener las tareas asignadas al usuario
    const fetchMyTasks = async () => {
        try {
            const response = await axios.get("http://localhost:3000/user/tasks", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            console.log("Tareas obtenidas:", response.data.tasks); // Verifica los datos obtenidos
            setMyTasks(response.data.tasks);
        } catch (error) {
            console.error("Error al obtener mis tareas:", error.response ? error.response.data : error.message);
            message.error("Error al obtener mis tareas");
        }
    };

    // Obtener los grupos del usuario
    const fetchGroups = async () => {
        try {
            const response = await axios.get("http://localhost:3000/user/groups", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setGroups(response.data.groups);
        } catch (error) {
            console.error("Error al obtener grupos:", error.response ? error.response.data : error.message);
            message.error("Error al obtener grupos");
        }
    };

    // Obtener las tareas de los grupos
    const fetchGroupTasks = async () => {
        try {
            const response = await axios.get("http://localhost:3000/user/groups", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const groups = response.data.groups;

            const allTasks = await Promise.all(groups.map(async (group) => {
                const tasksResponse = await axios.get(`http://localhost:3000/groups/${group.id}/tasks`, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                return tasksResponse.data.tasks;
            }));

            setGroupTasks(allTasks.flat());
        } catch (error) {
            console.error("Error al obtener tareas de los grupos:", error.response ? error.response.data : error.message);
            message.error("Error al obtener tareas de los grupos");
        }
    };

    // Obtener todos los usuarios
    const fetchUsers = async () => {
        try {
            const response = await axios.get("http://localhost:3000/users", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error("Error al obtener usuarios:", error.response ? error.response.data : error.message);
            message.error("Error al obtener usuarios");
        }
    };

    // Crear o actualizar una tarea
    const onCreateOrUpdate = async (values) => {
        try {
            const isEdit = Boolean(values.id);
            const endpoint = isEdit
                ? `http://localhost:3000/tasks/update/${values.id}`
                : "http://localhost:3000/tasks";
            const method = isEdit ? "put" : "post";

            await axios({
                method,
                url: endpoint,
                data: values,
                headers: { Authorization: `Bearer ${userToken}` },
            });

            message.success(isEdit ? "Tarea actualizada con éxito" : "Tarea creada con éxito");
            setVisible(false);
            setEditingTask(null);
            fetchMyTasks();
            fetchGroupTasks();
        } catch (error) {
            console.error("Error en la operación:", error.response ? error.response.data : error.message);
            message.error("Error al procesar la tarea");
        }
    };

    // Cambiar el estado de una tarea
  // Cambiar el estado de una tarea
const onChangeStatus = async (taskId, newStatus) => {
    try {
        await axios.put(
            `http://localhost:3000/tasks/${taskId}/update-status`, // Usa la nueva ruta de la API
            { status: newStatus }, // Envía el nuevo estado en el cuerpo de la solicitud
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            }
        );
        message.success('Estado de la tarea actualizado con éxito');
        fetchMyTasks(); // Actualiza la lista de tareas del usuario
        fetchGroupTasks(); // Actualiza la lista de tareas del grupo
    } catch (error) {
        console.error('Error al actualizar el estado:', error.response ? error.response.data : error.message);
        message.error('Error al actualizar el estado');
    }
};

    useEffect(() => {
        if (!userToken) {
            // Redirigir al usuario a la página de inicio de sesión
            window.location.href = "/login";
            return;
        }
        fetchMyTasks();
        fetchGroups();
        fetchGroupTasks();
        fetchUsers();
    }, [userToken]);

    // Organizar tareas por estado
    const organizeTasksByStatus = (tasks) => {
        return {
            "pendiente": tasks.filter((task) => task.status === "pendiente"),
            "en progreso": tasks.filter((task) => task.status === "en progreso"),
            "completado": tasks.filter((task) => task.status === "completado"),
        };
    };

    const myTasksByStatus = organizeTasksByStatus(myTasks);
    const groupTasksByStatus = organizeTasksByStatus(groupTasks);

    return (
        <MainLayout>
            <div style={{ padding: "20px" }}>
                <h2 style={{ textAlign: "justify", marginBottom: "20px" }}>Tareas</h2>
                {userRole === "management_task" && (
                    <Button
                        type="primary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setEditingTask(null);
                            setVisible(true);
                        }}
                        style={{ position: "fixed", bottom: 20, right: 20 }}
                    />
                )}
                <Tabs defaultActiveKey="1">
                    <TabPane tab="Mis Tareas" key="1">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(myTasksByStatus).map(([status, tasks]) => (
                                <div key={status} style={{ flex: 1, minWidth: "250px" }}>
                                    <h3>{status}</h3>
                                    <div style={{ backgroundColor: "#f0f0f0", borderRadius: "8px", padding: "10px" }}>
                                        {tasks.map((task) => (
                                            <Card
                                                key={task.id}
                                                style={{ marginBottom: "10px" }}
                                                actions={[
                                                    <Select
                                                        defaultValue={task.status}
                                                        style={{ width: "100%" }}
                                                        onChange={(value) => onChangeStatus(task.id, value)}
                                                    >
                                                        <Select.Option value="pendiente">Pendiente</Select.Option>
                                                        <Select.Option value="en progreso">En Progreso</Select.Option>
                                                        <Select.Option value="completado">Completado</Select.Option>
                                                    </Select>,
                                                    <Button
                                                        type="link"
                                                        onClick={() => {
                                                            setEditingTask(task);
                                                            setVisible(true);
                                                        }}
                                                    >
                                                        Editar
                                                    </Button>
                                                ]}
                                            >
                                                <Card.Meta title={task.name_task} description={task.description} />
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabPane>
                    <TabPane tab="Tareas del Grupo" key="2">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(groupTasksByStatus).map(([status, tasks]) => (
                                <div key={status} style={{ flex: 1, minWidth: "250px" }}>
                                    <h3>{status}</h3>
                                    <div style={{ backgroundColor: "#f0f0f0", borderRadius: "8px", padding: "10px" }}>
                                        {tasks.map((task) => (
                                            <Card key={task.id} style={{ marginBottom: "10px" }}>
                                                <Card.Meta title={task.name_task} description={task.description} />
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabPane>
                </Tabs>
                <TaskForm
                    visible={visible}
                    onCreate={onCreateOrUpdate}
                    onCancel={() => {
                        setVisible(false);
                        setEditingTask(null);
                    }}
                    taskData={editingTask}
                    groups={groups}
                    users={users}
                />
            </div>
        </MainLayout>
    );
};

export default DashboardPage;
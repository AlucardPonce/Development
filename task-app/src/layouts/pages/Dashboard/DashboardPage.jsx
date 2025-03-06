import React, { useState, useEffect } from "react";
import { Tabs, Button, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import MainLayout from "../../MainLayout";
import axios from "axios";
import TaskForm from "./Components/TaskForm";
import TaskList from "./Components/TaskList";

const { TabPane } = Tabs;

const statusColors = {
    completado: "#52c41a",
    "en progreso": "#1890ff",
    pendiente: "#fa8c16",
};

const DashboardPage = () => {
    const [createTaskVisible, setCreateTaskVisible] = useState(false); // Para el formulario de creación
    const [editingTask, setEditingTask] = useState(null); // Para el formulario de edición
    const [myTasks, setMyTasks] = useState([]); // Tareas personales (creadas por el usuario)
    const [assignedTasks, setAssignedTasks] = useState([]); // Tareas asignadas al usuario
    const [groupTasks, setGroupTasks] = useState([]); // Tareas de grupo
    const [groups, setGroups] = useState([]); // Grupos
    const [users, setUsers] = useState([]); // Usuarios
    const userToken = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    // Obtener tareas personales (creadas por el usuario)
    const fetchPersonalTasks = async () => {
        try {
            const response = await axios.get("https://development-iyl1.onrender.com/tasks", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setMyTasks(response.data.tasks); // Actualiza el estado `myTasks`
        } catch (error) {
            console.error("Error al obtener tareas personales:", error.response ? error.response.data : error.message);
            message.error("Error al obtener tareas personales");
        }
    };

    // Obtener tareas asignadas al usuario
    const fetchAssignedTasks = async () => {
        try {
            const response = await axios.get("https://development-iyl1.onrender.com/user/tasks", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setAssignedTasks(response.data.tasks); // Actualiza el estado `assignedTasks`
        } catch (error) {
            console.error("Error al obtener tareas asignadas:", error.response ? error.response.data : error.message);
            message.error("Error al obtener tareas asignadas");
        }
    };

    // Obtener grupos
    const fetchGroups = async () => {
        try {
            const response = await axios.get("https://development-iyl1.onrender.com/user/groups", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setGroups(response.data.groups);
        } catch (error) {
            console.error("Error al obtener grupos:", error.response ? error.response.data : error.message);
            message.error("Error al obtener grupos");
        }
    };

    // Obtener tareas de los grupos
    const fetchGroupTasks = async () => {
        try {
            const response = await axios.get("https://development-iyl1.onrender.com/user/groups", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            const groups = response.data.groups;

            const allTasks = await Promise.all(groups.map(async (group) => {
                const tasksResponse = await axios.get(`https://development-iyl1.onrender.com/groups/${group.id}/tasks`, {
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

    // Obtener usuarios
    const fetchUsers = async () => {
        try {
            const response = await axios.get("https://development-iyl1.onrender.com/users", {
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
                ? `https://development-iyl1.onrender.com/tasks/update/${values.id}`
                : "https://development-iyl1.onrender.com/tasks";
            const method = isEdit ? "put" : "post";

            await axios({
                method,
                url: endpoint,
                data: values,
                headers: { Authorization: `Bearer ${userToken}` },
            });

            message.success(isEdit ? "Tarea actualizada con éxito" : "Tarea creada con éxito");
            setCreateTaskVisible(false); // Cierra el formulario de creación
            setEditingTask(null); // Cierra el formulario de edición
            fetchPersonalTasks(); // Actualiza las tareas personales
            fetchAssignedTasks(); // Actualiza las tareas asignadas
            fetchGroupTasks(); // Actualiza las tareas de grupo
        } catch (error) {
            console.error("Error en la operación:", error.response ? error.response.data : error.message);
            message.error("Error al procesar la tarea");
        }
    };

    // Cambiar el estado de una tarea
    const onChangeStatus = async (taskId, newStatus) => {
        try {
            await axios.put(
                `https://development-iyl1.onrender.com/tasks/${taskId}/update-status`,
                { status: newStatus },
                {
                    headers: { Authorization: `Bearer ${userToken}` },
                }
            );
            message.success("Estado de la tarea actualizado con éxito");
            fetchPersonalTasks(); // Actualiza las tareas personales
            fetchAssignedTasks(); // Actualiza las tareas asignadas
            fetchGroupTasks(); // Actualiza las tareas de grupo
        } catch (error) {
            console.error("Error al actualizar el estado:", error.response ? error.response.data : error.message);
            message.error("Error al actualizar el estado");
        }
    };

    // Cargar datos iniciales
    useEffect(() => {
        if (!userToken) {
            window.location.href = "/login";
            return;
        }
        fetchPersonalTasks(); // Cargar tareas personales
        fetchAssignedTasks(); // Cargar tareas asignadas
        fetchGroups(); // Cargar grupos
        fetchGroupTasks(); // Cargar tareas de grupo
        fetchUsers(); // Cargar usuarios
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
    const assignedTasksByStatus = organizeTasksByStatus(assignedTasks);
    const groupTasksByStatus = organizeTasksByStatus(groupTasks);

    return (
        <MainLayout>
            {/* Formulario de creación (arriba de todo) */}
            <TaskForm
                visible={createTaskVisible}
                onCreate={onCreateOrUpdate}
                onCancel={() => {
                    setCreateTaskVisible(false); // Cierra el formulario de creación
                }}
                taskData={null} // No hay datos porque es una creación
                groups={groups}
                users={users}
            />

            <div style={{ padding: "20px" }}>
                <h2 style={{ textAlign: "justify", marginBottom: "20px" }}>Tareas</h2>

                {/* Botón "+" visible para todos */}
                <Button
                    type="primary"
                    shape="circle"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setCreateTaskVisible(true); // Abre el formulario de creación
                    }}
                    style={{ position: "fixed", bottom: 20, right: 20 }}
                />

                <Tabs defaultActiveKey="1">
                    <TabPane tab="Mis Tareas" key="1">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(myTasksByStatus).map(([status, tasks]) => (
                                <TaskList
                                    key={status}
                                    tasks={tasks.map(task => ({ ...task, backgroundColor: statusColors[task.status] }))}
                                    status={status}
                                    onChangeStatus={onChangeStatus}
                                    onEdit={(task) => {
                                        setEditingTask(task); // Establece la tarea a editar
                                    }}
                                />
                            ))}
                        </div>
                    </TabPane>
                    <TabPane tab="Tareas Asignadas" key="2">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(assignedTasksByStatus).map(([status, tasks]) => (
                                <TaskList
                                    key={status}
                                    tasks={tasks.map(task => ({ ...task, backgroundColor: statusColors[task.status] }))}
                                    status={status}
                                    onChangeStatus={onChangeStatus}
                                    onEdit={(task) => {
                                        setEditingTask(task); // Establece la tarea a editar
                                    }}
                                />
                            ))}
                        </div>
                    </TabPane>
                    <TabPane tab="Tareas del Grupo" key="3">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(groupTasksByStatus).map(([status, tasks]) => (
                                <TaskList
                                    key={status}
                                    tasks={tasks.map(task => ({ ...task, backgroundColor: statusColors[task.status] }))}
                                    status={status}
                                    onChangeStatus={onChangeStatus}
                                    onEdit={(task) => {
                                        setEditingTask(task); // Establece la tarea a editar
                                    }}
                                />
                            ))}
                        </div>
                    </TabPane>
                </Tabs>

                {/* Formulario de edición */}
                <TaskForm
                    visible={!!editingTask} // Se muestra solo si hay una tarea para editar
                    onCreate={onCreateOrUpdate}
                    onCancel={() => {
                        setEditingTask(null); // Cierra el formulario de edición
                    }}
                    taskData={editingTask} // Pasa la tarea a editar
                    groups={groups}
                    users={users}
                />
            </div>
        </MainLayout>
    );
};

export default DashboardPage;

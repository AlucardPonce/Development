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
    const [visible, setVisible] = useState(false);
    const [myTasks, setMyTasks] = useState([]);
    const [groupTasks, setGroupTasks] = useState([]);
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [editingTask, setEditingTask] = useState(null);
    const userToken = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    const fetchMyTasks = async () => {
        try {
            const response = await axios.get("http://localhost:3000/user/tasks", {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setMyTasks(response.data.tasks);
        } catch (error) {
            console.error("Error al obtener mis tareas:", error.response ? error.response.data : error.message);
            message.error("Error al obtener mis tareas");
        }
    };

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

    const onChangeStatus = async (taskId, newStatus) => {
        try {
            await axios.put(
                `http://localhost:3000/tasks/${taskId}/update-status`,
                { status: newStatus },
                {
                    headers: { Authorization: `Bearer ${userToken}` },
                }
            );
            message.success("Estado de la tarea actualizado con éxito");
            fetchMyTasks();
            fetchGroupTasks();
        } catch (error) {
            console.error("Error al actualizar el estado:", error.response ? error.response.data : error.message);
            message.error("Error al actualizar el estado");
        }
    };

    useEffect(() => {
        if (!userToken) {
            window.location.href = "/login";
            return;
        }
        fetchMyTasks();
        fetchGroups();
        fetchGroupTasks();
        fetchUsers();
    }, [userToken]);

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
                                <TaskList
                                    key={status}
                                    tasks={tasks.map(task => ({ ...task, backgroundColor: statusColors[task.status] }))}
                                    status={status}
                                    onChangeStatus={onChangeStatus}
                                    onEdit={(task) => {
                                        setEditingTask(task);
                                        setVisible(true);
                                    }}
                                />
                            ))}
                        </div>
                    </TabPane>
                    <TabPane tab="Tareas del Grupo" key="2">
                        <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
                            {Object.entries(groupTasksByStatus).map(([status, tasks]) => (
                                <TaskList
                                    key={status}
                                    tasks={tasks.map(task => ({ ...task, backgroundColor: statusColors[task.status] }))}
                                    status={status}
                                    onChangeStatus={onChangeStatus}
                                    onEdit={(task) => {
                                        setEditingTask(task);
                                        setVisible(true);
                                    }}
                                />
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
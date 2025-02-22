import React, { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button, message, Select } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import axios from "axios";

const TaskForm = ({ visible, onCreate, onCancel, taskData }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (taskData) {
      form.setFieldsValue(taskData);
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
          <DatePicker showTime />
        </Form.Item>
        <Form.Item
          name="remind_me"
          label="Recordarme"
          rules={[{ required: true, message: "Por favor selecciona la fecha y hora" }]}
        >
          <DatePicker showTime />
        </Form.Item>
        <Form.Item
          label="Estado"
          name="status"
          rules={[{ required: true, message: "Por favor, seleccione un estado" }]}
        >
          <Select placeholder="Seleccione un estado">
            <Select.Option value="In Progress">En Progreso</Select.Option>
            <Select.Option value="Done">Hecho</Select.Option>
            <Select.Option value="Paused">Pausado</Select.Option>
            <Select.Option value="Revision">Revisión</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          name="category"
          label="Categoría"
          rules={[{ required: true, message: "Por favor ingresa la categoría" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const DashboardPage = () => {
  const [visible, setVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem("token"));

  const fetchTasks = async () => {
    try {
      const response = await axios.get("http://localhost:3000/tasks", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      setTasks(response.data.tasks);
    } catch (error) {
      console.error("Error al obtener tareas:", error);
      message.error("Error al obtener tareas");
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
      fetchTasks();
    } catch (error) {
      console.error("Error en la operación:", error);
      message.error("Error al procesar la tarea");
    }
  };

  const onEdit = (task) => {
    setEditingTask(task);
    setVisible(true);
  };

  const onDelete = async (id) => {
    console.log("Eliminando tarea con ID:", id);
    if (!id) {
      message.error("ID de tarea no válido");
      return;
    }
  
    try {
      await axios.delete(`http://localhost:3000/tasks/delete/${id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
  
      message.success("Tarea eliminada con éxito");
      fetchTasks();
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
      message.error("Error al eliminar la tarea");
    }
  };
  useEffect(() => {
    if (userToken) fetchTasks();
  }, [userToken]);

  return (
    <MainLayout>
      <div style={{ padding: "20px" }}>
        <h2 style={{ textAlign: "justify", marginBottom: "20px" }}>Tareas</h2>
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
        <div
          style={{
            marginTop: "40px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: "4px",
                  padding: "15px",
                  margin: "10px 0",
                  backgroundColor: "#f9f9f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 10px" }}>{task.name_task}</h4>
                  <p style={{ margin: "5px 0" }}>
                    Estado: <strong>{task.status}</strong>
                  </p>
                </div>
                <div>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => onEdit(task)}
                    aria-label="Editar tarea"
                    style={{ marginRight: "8px" }}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(task.id)}
                    danger
                    aria-label="Eliminar tarea"
                  />
                </div>
              </div>
            ))
          ) : (
            <p>No hay tareas disponibles.</p>
          )}
        </div>
        <TaskForm
          visible={visible}
          onCreate={onCreateOrUpdate}
          onCancel={() => setVisible(false)}
          taskData={editingTask}
        />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
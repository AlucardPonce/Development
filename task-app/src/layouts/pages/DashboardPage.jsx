import React, { useState, useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button, message, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import MainLayout from "../../layouts/MainLayout";
import axios from "axios";

const TaskForm = ({ visible, onCreate, onCancel, username }) => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    // Agregar el username a los valores antes de crear la tarea
    onCreate({ ...values, username });
    form.resetFields();
  };

  return (
    <Modal
      visible={visible}
      title="Crear Tarea"
      okText="Crear"
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
  const userToken = localStorage.getItem("token"); // Obtener el token del usuario
  const username = localStorage.getItem("username"); // Obtener el username del usuario desde localStorage

  const onCreate = async (values) => {
    try {
      const response = await axios.post("http://localhost:3000/tasks", values, {
        headers: {
          Authorization: `Bearer ${userToken}`, // Enviar el token para autenticar la solicitud
        },
      });
      message.success(response.data.message); // Mostrar mensaje de éxito
      setVisible(false);
      fetchTasks(); // Refrescar la lista de tareas
    } catch (error) {
      console.error("Error al crear la tarea:", error);
      message.error("Error al crear la tarea");
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/tasks`, {
        headers: {
          Authorization: `Bearer ${userToken}`, // Enviar el token para autenticar la solicitud
        },
      });
      setTasks(response.data.tasks); // Almacenar las tareas en el estado
    } catch (error) {
      console.error("Error al obtener tareas:", error);
      message.error("Error al obtener tareas");
    }
  };

  useEffect(() => {
    fetchTasks(); // Cargar las tareas al montar el componente
  }, []);

  return (
    <MainLayout>
      <div style={{ padding: "20px" }}>
        <h2 style={{ textAlign: "justify", marginBottom: "20px" }}>Tareas</h2>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          onClick={() => setVisible(true)}
          style={{ position: "fixed", bottom: 20, right: 20 }}
        />
        <div style={{ marginTop: "40px", backgroundColor: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} style={{ border: "1px solid #d9d9d9", borderRadius: "4px", padding: "15px", margin: "10px 0", backgroundColor: "#f9f9f9" }}>
                <h4 style={{ margin: "0 0 10px" }}>{task.name_task}</h4>
                <p style={{ margin: "5px 0" }}>Estado: <strong>{task.status}</strong></p>
              </div>
            ))
          ) : (
            <p>No hay tareas disponibles.</p>
          )}
        </div>
        <TaskForm
          visible={visible}
          onCreate={onCreate}
          onCancel={() => setVisible(false)}
          username={username} // Pasar el username al componente de formulario
        />
      </div>
    </MainLayout>
  );
};

export default DashboardPage;

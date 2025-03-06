import React, { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Select } from "antd";
import dayjs from "dayjs";

const TaskForm = ({ visible, onCreate, onCancel, taskData, groups, users }) => {
    const [form] = Form.useForm();

    // Resetear el formulario cuando cambia `taskData` o `visible`
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

    // Enviar los datos del formulario
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

                {/* Mostrar "Grupo" y "Asignar a" solo en edición */}
                {taskData && (
                    <>
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
                                    <Select.Option key={user.id} value={user.id}>
                                        {user.username}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
};

export default TaskForm;
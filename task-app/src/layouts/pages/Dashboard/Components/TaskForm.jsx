import React, { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Select } from "antd";
import dayjs from "dayjs";

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
                {/* Campos del formulario */}
            </Form>
        </Modal>
    );
};

export default TaskForm;
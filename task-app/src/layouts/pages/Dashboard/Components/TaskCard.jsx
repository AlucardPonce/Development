import React from "react";
import { Card, Select, Button } from "antd";

const TaskCard = ({ task, onChangeStatus, onEdit }) => {
    return (
        <Card
            style={{
                marginBottom: "10px",
                backgroundColor: task.backgroundColor,
                color: "#fff",
            }}
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
                <Button type="link" onClick={() => onEdit(task)}>
                    Editar
                </Button>,
            ]}
        >
            <Card.Meta title={task.name_task} description={task.description} />
        </Card>
    );
};

export default TaskCard; // Exportación por defecto
import React from "react";
import TaskCard from "./TaskCard";

const TaskList = ({ tasks, status, onChangeStatus, onEdit }) => {
    return (
        <div style={{ flex: 1, minWidth: "250px" }}>
            <h3>{status}</h3>
            <div style={{ backgroundColor: "#f0f0f0", borderRadius: "8px", padding: "10px" }}>
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={{ ...task, backgroundColor: task.backgroundColor }}
                        onChangeStatus={onChangeStatus}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </div>
    );
};

export default TaskList; // Exportación por defecto
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TasksPage() {
    const [tasks, setTasks] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasks = async () => {
            const res = await fetch("http://127.0.0.1:8000/tasks");
            const data = await res.json();
            setTasks(data);
        };
        fetchTasks();
        const interval = setInterval(fetchTasks, 300000); // refresh every 5 minutes
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-5">
            <h1 className="text-xl font-bold mb-4">All Tasks</h1>
            <div className="grid gap-4">
                {Object.entries(tasks).map(([id, task]) => (
                    <div
                        key={id}
                        className={`p-4 border rounded cursor-pointer ${task.status === "SUCCESS" ? "bg-green-100" : "bg-gray-100"}`}
                        onClick={() => {
                            if (task.status === "SUCCESS") navigate(`/result/${id}`);
                        }}
                    >
                        <p><strong>Task ID:</strong> {id}</p>
                        <p><strong>Status:</strong> {task.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

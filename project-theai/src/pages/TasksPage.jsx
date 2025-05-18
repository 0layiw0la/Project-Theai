import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function TasksPage() {
    const [tasks, setTasks] = useState({});
    const navigate = useNavigate();
    const { token } = useAuth();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/tasks", {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!res.ok) {
                    if (res.status === 401) {
                        // Token expired or invalid, redirect to login
                        navigate('/login');
                        return;
                    }
                    throw new Error('Failed to fetch tasks');
                }
                
                const data = await res.json();
                setTasks(data);
            } catch (error) {
                console.error("Error fetching tasks:", error);
            }
        };
        
        fetchTasks();
        const interval = setInterval(fetchTasks, 300000); // refresh every 5 minutes
        return () => clearInterval(interval);
    }, [token, navigate]);

    return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-5">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">All Tasks</h1>
                    <button 
                        className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                        onClick={() => navigate('/upload')}
                    >
                        + New Test
                    </button>
                </div>
                
                {Object.keys(tasks).length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No tasks found. Create a new test.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(tasks).map(([id, task]) => (
                            <div
                                key={id}
                                className={`p-4 border rounded-lg shadow cursor-pointer ${
                                    task.status === "SUCCESS" ? "bg-green-50" : 
                                    task.status === "FAILED" ? "bg-red-50" : "bg-gray-50"
                                }`}
                                onClick={() => {
                                    if (task.status === "SUCCESS") navigate(`/result/${id}`);
                                }}
                            >
                                <p className="text-lg font-semibold">
                                    {task.patient_name || "Unnamed Patient"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {task.date || "No date"}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                    <p className={`text-sm ${
                                        task.status === "SUCCESS" ? "text-green-600" : 
                                        task.status === "FAILED" ? "text-red-600" : "text-blue-600"
                                    }`}>
                                        {task.status}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(task.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}


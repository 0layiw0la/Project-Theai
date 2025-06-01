import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function TasksPage() {
    const [tasks, setTasks] = useState({});
    const [isPolling, setIsPolling] = useState(false);
    const navigate = useNavigate();
    const { token } = useAuth();

    const fetchTasks = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/tasks", {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to fetch tasks');
            }
            
            const data = await res.json();
            setTasks(data);
            
            // Check if any tasks are still processing
            const hasProcessing = Object.values(data).some(task => 
                task.status === "PENDING" || task.status === "PROCESSING"
            );
            setIsPolling(hasProcessing);
            
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    };

    // Trigger cleanup only on first load
    const triggerCleanup = async () => {
        try {
            await fetch("http://127.0.0.1:8000/cleanup-tasks", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log("Cleanup triggered on page load");
        } catch (error) {
            console.error("Cleanup failed:", error);
        }
    };

    useEffect(() => {
        // Initial load: trigger cleanup and fetch tasks
        const initialLoad = async () => {
            await triggerCleanup(); // Clean up orphaned tasks first
            await fetchTasks();     // Then fetch fresh task list
        };
        
        initialLoad();
    }, [token, navigate]);

    // Smart polling: only if there are processing tasks
    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(() => {
            console.log("Smart polling: checking task updates...");
            fetchTasks();
        }, 300000); // Changed from 10000 to 300000 (5 minutes)

        return () => clearInterval(interval);
    }, [isPolling]);

    const refreshTasks = async () => {
        await fetchTasks();
    };

    return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-5">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">All Tasks</h1>
                    <div className="flex gap-2">
                        <button 
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            onClick={refreshTasks}
                        >
                            Refresh
                        </button>
                        <button 
                            className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                            onClick={() => navigate('/upload')}
                        >
                            + New Test
                        </button>
                    </div>
                </div>

                {/* Show polling status */}
                {isPolling && (
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
                        <p className="text-blue-700 text-sm flex items-center">
                            <span className="animate-spin mr-2">🔄</span>
                            Auto-updating tasks in progress... 
                            ({Object.values(tasks).filter(t => t.status === "PENDING" || t.status === "PROCESSING").length} active)
                        </p>
                    </div>
                )}
                
                {Object.keys(tasks).length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No tasks found. Create a new test.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(tasks).map(([id, task]) => (
                            <div
                                key={id}
                                className={`p-4 border rounded-lg shadow cursor-pointer transition-colors ${
                                    task.status === "SUCCESS" ? "bg-green-50 hover:bg-green-100 border-green-200" : 
                                    task.status === "FAILED" ? "bg-red-50 border-red-200" : 
                                    task.status === "PROCESSING" ? "bg-yellow-50 border-yellow-200" :
                                    "bg-gray-50 border-gray-200"
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
                                    <p className={`text-sm font-medium flex items-center ${
                                        task.status === "SUCCESS" ? "text-green-600" : 
                                        task.status === "FAILED" ? "text-red-600" : 
                                        task.status === "PROCESSING" ? "text-yellow-600" :
                                        "text-blue-600"
                                    }`}>
                                        {task.status === "PROCESSING" && <span className="animate-pulse mr-1">🔄</span>}
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
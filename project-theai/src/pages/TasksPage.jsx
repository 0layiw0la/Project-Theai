import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function TasksPage() {
    console.log('🚀 TasksPage component loaded!');
    
    const [tasks, setTasks] = useState({});
    const [loading, setLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(false);
    const [retryingTasks, setRetryingTasks] = useState(new Set());
    const [deletingTasks, setDeletingTasks] = useState(new Set());
    const navigate = useNavigate();
    const { token, apiCall, getTasks, isAuthenticated } = useAuth(); // ✅ Get getTasks

    const fetchTasks = async () => {
        console.log('🚀 fetchTasks called');
        setLoading(true);
        try {
            // ✅ Use the special getTasks function
            const data = await getTasks();
            console.log('🚀 Tasks received in component:', data);
            setTasks(data);
            
            const hasProcessing = Object.values(data).some(task => 
                task.status === "PENDING" || task.status === "PROCESSING"
            );
            setIsPolling(hasProcessing);
            
        } catch (error) {
            console.error("🚀 Error in fetchTasks:", error);
        } finally {
            setLoading(false);
        }
    };

    // Keep other functions the same for now...
    const retryTask = async (taskId, event) => {
        event.stopPropagation();
        setRetryingTasks(prev => new Set([...prev, taskId]));
        
        try {
            const response = await apiCall(`retry/${taskId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                await fetchTasks();
            } else {
                alert('Retry failed');
            }
        } catch (error) {
            alert('Retry failed');
        } finally {
            setRetryingTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    const deleteTask = async (taskId, event) => {
        event.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            return;
        }
        
        setDeletingTasks(prev => new Set([...prev, taskId]));
        
        try {
            const response = await apiCall(`task/${taskId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                setTasks(prev => {
                    const newTasks = { ...prev };
                    delete newTasks[taskId];
                    return newTasks;
                });
                await fetchTasks();
            } else {
                const error = await response.json().catch(() => ({ message: 'Delete failed' }));
                alert(error.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed');
        } finally {
            setDeletingTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    };

    useEffect(() => {
        console.log('🚀 TasksPage useEffect triggered');
        console.log('🚀 isAuthenticated:', isAuthenticated);
        console.log('🚀 token exists:', !!token);
        
        if (isAuthenticated && token) {
            console.log('🚀 Calling fetchTasks...');
            fetchTasks();
        } else {
            console.log('🚀 Not authenticated, waiting...');
        }
    }, [isAuthenticated, token]);

    // Rest of your component stays the same...
    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(() => {
            console.log("Smart polling: checking task updates...");
            fetchTasks();
        }, 240000);

        return () => clearInterval(interval);
    }, [isPolling]);

    return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl md:text-7xl font-[500] text-main">Existing Tasks</h1>
                    <div>
                        <button 
                            className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                            onClick={() => navigate('/form')}
                        >
                            + New Test
                        </button>
                    </div>
                </div>
                
                {loading ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">Loading tasks...</p>
                    </div>
                ) : Object.keys(tasks).length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No tasks found. Create a new test.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(tasks).map(([id, task]) => (
                            <div
                                key={id}
                                className={`p-4 border shadow cursor-pointer transition-colors relative ${
                                    task.status === "SUCCESS" ? "bg-green-50 hover:bg-green-100 border-green-200" : 
                                    task.status === "FAILED" ? "bg-red-50 hover:bg-red-100 border-red-200" : 
                                    task.status === "PROCESSING" ? "bg-yellow-50 border-yellow-200" :
                                    "bg-gray-50 border-gray-200"
                                }`}
                                onClick={() => {
                                    if (task.status === "SUCCESS") navigate(`/result/${id}`);
                                }}
                            >
                                <button
                                    onClick={(e) => deleteTask(id, e)}
                                    disabled={deletingTasks.has(id)}
                                    className={`absolute top-2 right-2 w-8 h-8 text-xl font-bold transition-colors ${
                                        deletingTasks.has(id) 
                                            ? "bg-transparent text-gray-500 cursor-not-allowed" 
                                            : "bg-transparent text-2xl text-red-600 hover:cursor-pointer"
                                    }`}
                                    title="Delete task"
                                >
                                    {deletingTasks.has(id) ? "..." : "×"}
                                </button>

                                <div className="hidden">{id}</div>
                                
                                <p className="text-lg font-semibold pr-8">
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
                                        {task.status === "PROCESSING" && (
                                            <div className="animate-spin mr-1 w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                                        )}
                                        {task.status}
                                        {task.status === "FAILED" && (
                                            <span 
                                                className={`ml-2 text-xs underline cursor-pointer ${
                                                    retryingTasks.has(id) ? "text-gray-400" : "text-red-500 hover:text-red-700"
                                                }`}
                                                onClick={(e) => retryTask(id, e)}
                                            >
                                                {retryingTasks.has(id) ? "retrying..." : "retry"}
                                            </span>
                                        )}
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
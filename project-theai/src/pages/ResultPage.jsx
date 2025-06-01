import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function ResultPage() {
    const { taskId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { token } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    useEffect(() => {
        const fetchResult = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/result/${taskId}`, {  // FIXED
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!res.ok) {
                    if (res.status === 401) {
                        navigate('/login');
                        return;
                    }
                    throw new Error('Failed to fetch result');
                }
                
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchResult();
    }, [taskId, token, navigate]);

    if (loading) return (
        <>
            <Logo showHomeButton={true}/>
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div>
            </div>
        </>
    );
    
    if (error) return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-5 max-w-4xl mx-auto">
                <div className="bg-red-50 p-4 rounded-md">
                    <h2 className="text-xl font-bold text-red-700">Error</h2>
                    <p>{error}</p>
                    <button 
                        className="mt-4 px-4 py-2 bg-main text-white rounded-md"
                        onClick={() => navigate('/tasks')}
                    >
                        Back to Tasks
                    </button>
                </div>
            </div>
        </>
    );
    
    if (!data || data.status !== "SUCCESS") return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-5 max-w-4xl mx-auto">
                <div className="bg-yellow-50 p-4 rounded-md">
                    <h2 className="text-xl font-bold text-yellow-700">Processing</h2>
                    <p>Analysis is still in progress. Please check back later.</p>
                    <p className="mt-2"><strong>Status:</strong> {data?.status || "Unknown"}</p>
                    <button 
                        className="mt-4 px-4 py-2 bg-main text-white rounded-md"
                        onClick={() => navigate('/tasks')}
                    >
                        Back to Tasks
                    </button>
                </div>
            </div>
        </>
    );

    const result = data.result || {};

    return (
        <>
            <Logo showHomeButton={true}/>
            <div className="p-5 max-w-4xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">
                        Test Results
                    </h1>
                    <button 
                        className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                        onClick={() => navigate('/tasks')}
                    >
                        Back to Tasks
                    </button>
                </div>
                
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-600">Patient</p>
                            <p className="font-medium text-lg">{data.patient_name || "Not specified"}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Date</p>
                            <p className="font-medium">{data.date || "Not specified"}</p>
                        </div>
                    </div>

                    {/* Main Results */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="text-xl font-bold mb-4">Analysis Results</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Show each key metric in a card */}
                            {result.average_parasite_density_per_1000_rbc !== undefined && (
                                <div className="bg-white p-4 rounded shadow">
                                    <h4 className="font-medium text-gray-500">Parasite Density</h4>
                                    <p className="text-2xl font-bold">
                                        {parseFloat(result.average_parasite_density_per_1000_rbc).toFixed(2)}
                                        <span className="text-sm font-normal text-gray-500"> per 1000 RBCs</span>
                                    </p>
                                </div>
                            )}
                            
                            {result.average_parasitemia_percent !== undefined && (
                                <div className="bg-white p-4 rounded shadow">
                                    <h4 className="font-medium text-gray-500">Parasitemia</h4>
                                    <p className="text-2xl font-bold">
                                        {parseFloat(result.average_parasitemia_percent).toFixed(2)}%
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {/* Stage Counts */}
                        {result.average_stage_counts && Object.keys(result.average_stage_counts).length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-medium mb-2">Parasite Stages</h4>
                                <div className="bg-white p-4 rounded shadow">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(result.average_stage_counts).map(([stage, count]) => (
                                            <div key={stage}>
                                                <p className="text-gray-500 capitalize">{stage}</p>
                                                <p className="text-xl font-semibold">{parseFloat(count).toFixed(1)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    
                    <div className="flex justify-between mt-6">
                        <button 
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            onClick={() => window.print()}
                        >
                            Print Results
                        </button>
                        <button 
                            className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                            onClick={() => navigate('/upload')}
                        >
                            New Test
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
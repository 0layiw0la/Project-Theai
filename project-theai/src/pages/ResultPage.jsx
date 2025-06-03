import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";
import ChatBox from '../components/ChatBox';
import chatIcon from '../assets/chat-icon.png';

export default function ResultPage() {
    const { taskId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const navigate = useNavigate();
    const { token } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    useEffect(() => {
        const fetchResult = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/result/${taskId}`, {
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

    const printReport = () => {
        const printWindow = window.open('', '_blank');
        const reportContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Malaria Test Report - ${data.patient_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .section { margin: 20px 0; }
                    .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .result-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                    .ai-report { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Malaria Diagnostic Report</h1>
                    <p><strong>Patient:</strong> ${data.patient_name || 'Not specified'}</p>
                    <p><strong>Sex:</strong> ${data.sex || 'Not specified'}</p>
                    <p><strong>Phone:</strong> ${data.phone_number || 'Not specified'}</p>
                    <p><strong>Date:</strong> ${data.date || 'Not specified'}</p>
                </div>
                
                <div class="section">
                    <h2>Test Results</h2>
                    <div class="result-grid">
                        ${data.result?.average_parasite_density_per_1000_rbc ? `
                            <div class="result-card">
                                <h3>Parasite Density</h3>
                                <p style="font-size: 24px; font-weight: bold;">
                                    ${parseFloat(data.result.average_parasite_density_per_1000_rbc).toFixed(2)} per 1000 RBCs
                                </p>
                            </div>
                        ` : ''}
                        
                        ${data.result?.average_parasitemia_percent ? `
                            <div class="result-card">
                                <h3>Parasitemia</h3>
                                <p style="font-size: 24px; font-weight: bold;">
                                    ${parseFloat(data.result.average_parasitemia_percent).toFixed(2)}%
                                </p>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${data.result?.average_stage_counts ? `
                        <div class="result-card">
                            <h3>Parasite Stages</h3>
                            ${Object.entries(data.result.average_stage_counts).map(([stage, count]) => 
                                `<p><strong>${stage}:</strong> ${parseFloat(count).toFixed(1)}</p>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
                
                ${data.ai_report ? `
                    <div class="ai-report">
                        <h2>AI Medical Analysis</h2>
                        <div style="white-space: pre-wrap;">${data.ai_report}</div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 40px; text-align: center; color: #666;">
                    <p>Generated by Project Theia - Llama AI Powered Malaria Diagnostics</p>
                    <p>This report is for medical reference only. Please consult a healthcare professional.</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(reportContent);
        printWindow.document.close();
        printWindow.print();
    };

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
            <div className="p-5 mt-5 max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-4xl md:text-7xl font-bold text-main">Results</h1>
                    <button 
                        className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                        onClick={() => navigate('/tasks')}
                    >
                        Back to Tasks
                    </button>
                </div>
                
                {/* ✅ UPDATED: Patient Information Section */}
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Patient Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-gray-600 text-sm">Patient Name</p>
                            <p className="font-medium text-lg">{data.patient_name || "Not specified"}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Sex</p>
                            <p className="font-medium text-lg">{data.sex || "Not specified"}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Test Date</p>
                            <p className="font-medium text-lg">
                                {data.date ? new Date(data.date).toLocaleDateString() : "Not specified"}
                            </p>
                        </div>
                        {/* Optional: Show phone number */}
                        {data.phone_number && (
                            <div className="md:col-span-3">
                                <p className="text-gray-600 text-sm">Phone Number</p>
                                <p className="font-medium">{data.phone_number}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ UPDATED: Analysis Results Section */}
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-xl font-bold mb-4">Analysis Results</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Parasite Density */}
                            {result.average_parasite_density_per_1000_rbc !== undefined && (
                                <div className="bg-white p-4 rounded shadow">
                                    <h4 className="font-medium text-gray-500">Parasite Density</h4>
                                    <p className="text-2xl font-bold">
                                        {parseFloat(result.average_parasite_density_per_1000_rbc).toFixed(2)}
                                        <span className="text-sm font-normal text-gray-500"> per 1000 RBCs</span>
                                    </p>
                                </div>
                            )}
                            
                            {/* Parasitemia Percentage */}
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
                </div>

                {/* AI Medical Report Section */}
                {data.ai_report && showReport && (
                    <div className="bg-white shadow-md rounded-lg p-6 mb-6 border-l-4 border-blue-500">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-blue-700">AI Medical Analysis Report</h3>
                            <button
                                onClick={() => setShowReport(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                                {data.ai_report}
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 border-t pt-4">
                            <p>⚠️ This AI-generated report is for reference only. Always consult with a qualified healthcare professional for medical decisions.</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Actions</h3>
                    <div className="flex flex-wrap gap-4">
                        {data.ai_report && (
                            <button
                                onClick={() => setShowReport(!showReport)}
                                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center gap-2 transition-colors"
                            >
                                <span>📋</span>
                                <span>{showReport ? 'Hide' : 'Show'} AI Report</span>
                            </button>
                        )}
                        
                        <button 
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            onClick={printReport}
                        >
                            📄 Print Full Report
                        </button>
                        <button 
                            className="px-4 py-2 bg-main text-white rounded-md hover:bg-complementary"
                            onClick={() => navigate('/upload')}
                        >
                            ➕ New Test
                        </button>
                    </div>
                </div>
            </div>

            {/* Ask AI Button */}
            <button
                onClick={() => setShowChat(true)}
                className="fixed bottom-5 right-5 md:right-15 z-50"
            >
                <img src={chatIcon} alt="Chat Icon" className="w-[60px] h-[60px]" />
            </button>

            {/* Chat Component */}
            <ChatBox
                taskId={taskId}
                isVisible={showChat}
                onClose={() => setShowChat(false)}
            />
        </>
    );
}
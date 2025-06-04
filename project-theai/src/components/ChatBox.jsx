import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import aiSendIcon from '../assets/ai-send.png';
import aiBackIcon from '../assets/ai-back.png';

export default function ChatBox({ taskId, isVisible, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);
    const { token, apiCall } = useAuth(); // ✅ Use apiCall instead of token only
    // ❌ REMOVED: const API_URL = import.meta.env.VITE_APP_API_URL;

    useEffect(() => {
        if (isVisible && taskId) loadHistory();
    }, [isVisible, taskId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadHistory = async () => {
        try {
            // ✅ CHANGED: Use apiCall proxy instead of direct fetch
            const res = await apiCall(`chat/${taskId}/history`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Load history failed:', error);
        }
    };

    const send = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        try {
            // ✅ CHANGED: Use apiCall proxy instead of direct fetch
            const res = await apiCall(`chat/${taskId}`, {
                method: 'POST',
                body: { message: userMsg }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                throw new Error('Send failed');
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Error occurred. Please try again.' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    // Custom components for markdown styling
    const markdownComponents = {
        h1: ({children}) => <h1 className="text-lg font-bold  mb-2">{children}</h1>,
        h2: ({children}) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
        h3: ({children}) => <h3 className="text-sm font-bold text-white mb-1">{children}</h3>,
        p: ({children}) => <p className="text-white mb-2">{children}</p>,
        strong: ({children}) => <strong className="font-bold text-white">{children}</strong>,
        code: ({children}) => <code className="bg-gray-200 px-1 rounded text-sm">{children}</code>,
        ul: ({children}) => <ul className="list-disc list-inside mb-2 text-white">{children}</ul>,
        ol: ({children}) => <ol className="list-decimal list-inside mb-2 text-white">{children}</ol>,
        li: ({children}) => <li className="mb-1">{children}</li>
    };

    return (
        <>
            {/* Backdrop - only visible on mobile */}
            {isVisible && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Chat */}
            <div className={`fixed top-0 right-0 h-full shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
                isVisible ? 'translate-x-0' : 'translate-x-full'
            } w-full md:w-[40%] flex flex-col`} style={{backgroundColor: '#F5EEDD'}}>
                
                {/* Header with Theia Icon */}
                <div className="flex items-center p-6">
                    <button onClick={onClose} className="mr-4">
                        <img src={aiBackIcon} alt="Back" className="w-8 h-8" />
                    </button>
                </div>

                {/* Title Section */}
                <div className="px-6 pb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        Hello, I'm <span className="text-complementary">Theia</span>,
                    </h1>
                    <h2 className="text-2xl font-bold text-gray-800">
                        your AI assistant.
                    </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <p>💬 Start a conversation with Theia!</p>
                            <p className="text-sm mt-2">Ask me about your test results, symptoms, or treatment options.</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-4 py-3 rounded-lg ${
                                    msg.role === 'user' 
                                        ? 'bg-[#EAE3D0] text-complementary shadow-[_-3px_4px_0px_-2px_rgba(186,180,180,0.75)]' 
                                        : 'text-white bg-gradient-to-b from-[#077A7D] to-[#0ABEC3] shadow-[_-4px_5px_0px_-2px_rgba(186,180,180,0.75)] '
                                }`}>
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownComponents}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-teal-500 text-white px-4 py-3 rounded-2xl">
                                <div className="flex items-center space-x-1">
                                    <div className="animate-bounce text-white text-xs">●</div>
                                    <div className="animate-bounce text-white text-xs" style={{animationDelay: '0.1s'}}>●</div>
                                    <div className="animate-bounce text-white text-xs" style={{animationDelay: '0.2s'}}>●</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Section */}
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKey}
                            placeholder="Type your message"
                            className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            disabled={loading}
                        />
                        <button
                            onClick={send}
                            disabled={loading || !input.trim()}
                            className="disabled:opacity-50"
                        >
                            <img src={aiSendIcon} alt="Send" className="w-10 h-10" />
                        </button>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-3">Powered by Llama</p>
                </div>
            </div>
        </>
    );
}
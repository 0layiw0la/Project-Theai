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
    const { token, apiCall } = useAuth(); // ✅ Use apiCall instead of direct fetch

    useEffect(() => {
        if (isVisible && taskId) loadHistory();
    }, [isVisible, taskId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadHistory = async () => {
        try {
            // ✅ Use apiCall through proxy
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
        const message = input.trim();
        if (!message || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: message }]);
        setLoading(true);

        try {
            // ✅ Use apiCall through proxy
            const res = await apiCall(`chat/${taskId}`, {
                method: 'POST',
                body: { message }
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } catch (error) {
            console.error('Send failed:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const markdownComponents = {
        h1: ({ children }) => <h1 className="text-lg font-bold text-teal-700 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-md font-bold text-teal-600 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-teal-600 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-teal-800">{children}</strong>,
        em: ({ children }) => <em className="italic text-teal-700">{children}</em>,
        code: ({ children }) => <code className="bg-teal-50 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-teal-50 p-2 rounded text-sm font-mono overflow-x-auto mb-2">{children}</pre>,
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-teal-500 text-white rounded-t-xl">
                    <div className="flex items-center space-x-3">
                        <img src={aiBackIcon} alt="AI" className="w-8 h-8" />
                        <h3 className="text-lg font-semibold">Ask AI about your results</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white hover:bg-teal-600 rounded-full p-1 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-8">
                            <img src={aiBackIcon} alt="AI" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Ask me anything about your malaria test results!</p>
                            <p className="text-sm mt-2">I can help explain the findings, discuss treatment options, or answer any questions you might have.</p>
                        </div>
                    )}
                    
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                                msg.role === 'user' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-teal-50 text-gray-800 border border-teal-200'
                            }`}>
                                {msg.role === 'assistant' && msg.content.includes('#') ? (
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
                    ))}
                    
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
                <div className="border-t p-4">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                            placeholder="Ask about your results..."
                            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <button
                            onClick={send}
                            disabled={loading || !input.trim()}
                            className="bg-teal-500 text-white rounded-full p-2 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <img src={aiSendIcon} alt="Send" className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        This AI assistant provides general information only. Always consult your healthcare provider for medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
}
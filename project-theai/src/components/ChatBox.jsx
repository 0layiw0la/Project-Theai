import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ChatBox({ taskId, isVisible, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);
    const { token } = useAuth();
    const API_URL = import.meta.env.VITE_APP_API_URL;

    useEffect(() => {
        if (isVisible && taskId) loadHistory();
    }, [isVisible, taskId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/chat/${taskId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
            const res = await fetch(`${API_URL}/chat/${taskId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMsg })
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

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl h-3/4 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-main">AI Medical Assistant</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <p>💬 Ask me about your test results!</p>
                            <p className="text-sm mt-2">I can explain your parasite counts, severity levels, and treatment options.</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-md px-4 py-2 rounded-lg ${
                                    msg.role === 'user' 
                                        ? 'bg-main text-white' 
                                        : 'bg-gray-100 text-gray-800 border'
                                }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 border px-4 py-2 rounded-lg">
                                <div className="flex items-center space-x-1">
                                    <div className="animate-bounce text-main">●</div>
                                    <div className="animate-bounce text-main" style={{animationDelay: '0.1s'}}>●</div>
                                    <div className="animate-bounce text-main" style={{animationDelay: '0.2s'}}>●</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="border-t p-4">
                    <div className="flex gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKey}
                            placeholder="Ask about your malaria test results..."
                            className="flex-1 border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-main focus:border-main"
                            rows={2}
                            disabled={loading}
                        />
                        <button
                            onClick={send}
                            disabled={loading || !input.trim()}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                loading || !input.trim()
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-main text-white hover:bg-complementary'
                            }`}
                        >
                            Send
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Press Enter to send, Shift+Enter for new line</p>
                </div>
            </div>
        </div>
    );
}
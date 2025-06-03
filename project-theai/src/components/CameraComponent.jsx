import { useEffect, useRef, useState } from "react";

export default function CameraComponent({ isOpen, onClose, onPhotoAdd }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            setShowPreview(false);
            setCapturedImage(null);
        }
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line
    }, [isOpen]);

    const startCamera = async () => {
        try {
            // Stop any existing stream first
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            
            setTimeout(() => {
                if (videoRef.current && mediaStream) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (error) {
            alert("Camera access denied.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture_${Date.now()}.jpg`, {
                        type: 'image/jpeg'
                    });
                    setCapturedImage(file);
                    setShowPreview(true);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const handleSave = () => {
        if (capturedImage) {
            onPhotoAdd(capturedImage);
            setCapturedImage(null);
            setShowPreview(false);
            // Restart camera after saving
            setTimeout(() => {
                if (videoRef.current && stream) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        }
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setShowPreview(false);
        // Restart camera after retry
        setTimeout(() => {
            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
            }
        }, 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:hidden">
            <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
                <canvas ref={canvasRef} className="hidden" />
                {!showPreview ? (
                    <>
                        <div className="relative bg-black rounded-lg overflow-hidden mb-6">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-[60vh] object-cover"
                            />
                        </div>
                        <div className="flex justify-center gap-6">
                            <button
                                onClick={capturePhoto}
                                className="w-14 h-14 bg-white rounded-full border-2 border-main text-2xl hover:bg-gray-100 transition-colors"
                                aria-label="Take Photo"
                            >
                                📷
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-main text-white rounded-lg text-lg font-['Kelly_Slab'] hover:bg-complementary transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-poppins text-main mb-4 text-center">Preview Image</h2>
                        <div className="relative bg-black rounded-lg overflow-hidden mb-6">
                            <img
                                src={capturedImage ? URL.createObjectURL(capturedImage) : ''}
                                alt="Captured preview"
                                className="w-full h-[60vh] object-cover"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 px-6 bg-main text-white rounded-lg hover:bg-complementary transition-colors font-['Kelly_Slab'] text-lg"
                            >
                                Done
                            </button>
                            <button
                                onClick={handleRetry}
                                className="flex-1 py-3 px-6 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-['Kelly_Slab'] text-lg"
                            >
                                Retry
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
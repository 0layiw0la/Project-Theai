import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

export default function UploadPage(){
    const navigate = useNavigate();
    const location = useLocation();

  const { firstName, lastName, tel } = location.state || {};

    const { token } = useAuth();
    const [uploading, setUploading] = useState(false);
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    // ✅ ADD: Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

   const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ UPDATE: Check both uploaded files AND captured photos
    const totalImages = (imgs ? imgs.length : 0) + capturedPhotos.length;
    if (totalImages === 0) {
        setImgError("Please select at least one image or take photos");
        return;
    }

    setUploading(true);
    const formData = new FormData();

    // ✅ ADD: Append captured photos
    capturedPhotos.forEach((photo, index) => {
        formData.append("files", photo, `captured_${index}.jpg`);
    });

    // Append uploaded files
    if (imgs) {
        for (let i = 0; i < imgs.length; i++) {
            formData.append("files", imgs[i]);
        }
    }

    // ✅ COMBINE firstName and lastName into fullName
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    formData.append("fullName", fullName);

    // ✅ Include tel as is
    formData.append("tel", tel || "");

    // ✅ ADD: Current date (when submit is clicked)
    const date = new Date().toISOString();
    formData.append("date", date);

    try {
        const response = await fetch(`${API_BASE_URL}/submit`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            alert('Session expired. Please login again.');
            navigate('/login');
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Upload failed:", errorData);
            setImgError("Upload failed. Please try again.");
            return;
        }

        const data = await response.json();
        console.log("Upload succeeded, task_id:", data.task_id);

        navigate(`/tasks`);
    } catch (error) {
        console.error("Network error:", error);
        setImgError("Network error. Please check your connection.");
    } finally {
        setUploading(false);
    }
};


    const [imgs, setImgs] = useState(null);
    const [imgErrror, setImgError] = useState("")

  

    const handleImageChange = (e) => {
        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        const files = e.target.files;
        
        if (files.length === 0) {
            setImgError("");
            setImgs(null);
            return;
        }
        
        for (let i = 0; i < files.length; i++){
           const file = files[i]
           
           if(!validTypes.includes(file.type)){
             return setImgError("Only JPG, JPEG, and PNG formats allowed.")
          }
          if(file.size > 5 * 1024 * 1024){
            return setImgError("Image size must be under 5MB.")
          }
        }
        setImgs(files);
        setImgError('');
    }

    // ✅ ADD: Camera functions
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (error) {
            setImgError("Camera access denied.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
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
                    setCapturedPhotos(prev => [...prev, file]);
                    setImgError("");
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const deletePhoto = (index) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // ✅ UPDATE: Calculate total images
    const totalImages = (imgs ? imgs.length : 0) + capturedPhotos.length;

    return(
        <>
        <Logo showHomeButton={true}/>
         <section className="mt-[40px] min-h-screen m-[20px]">
            
            <div className="px-[2vw] flex flex-col justify-center items-center mt-[50px]">
                <h1 className="text-[30px] md:text-5xl font-poppins font-[400] text-main mb-3">Upload Images</h1>
                <p className="text-center mt-[10px] text-[16px] md:text-[19px] mb-[25px] text-main font-['Kelly_Slab']">Upload clear microscopic images of blood smears for malaria detection.</p>

                {/* ✅ ADD: Camera button */}
                {!showCamera && (
                    <button
                        onClick={startCamera}
                        disabled={uploading}
                        className="mb-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 lg:hidden"
                    >
                        📷 Take Photos
                    </button>
                )}

                {/* ✅ ADD: Camera interface */}
                {showCamera && (
                    <div className="mb-4 w-full max-w-2xl">
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-[400px] object-cover"
                            />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 bg-white rounded-full border-4 border-blue-500"
                                >
                                    📷
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageChange} 
                    className="px-[2vw] py-[100px] mt-[20px] rounded-[20px] border border-dashed focus:outline-none focus:ring-1 focus:ring-main transition text-[16px] md:text-[18px]" 
                    disabled={uploading}
                />

                {imgErrror && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {imgErrror}
                    </div>
                )}

                {/* ✅ ADD: Show captured photos */}
                {capturedPhotos.length > 0 && (
                    <div className="mt-[5vh]">
                        <p className="text-center mb-4 font-medium">
                            {capturedPhotos.length} photo{capturedPhotos.length > 1 ? 's' : ''} captured
                        </p>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                            {capturedPhotos.map((photo, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={URL.createObjectURL(photo)}
                                        alt={`Captured ${index + 1}`}
                                        className="w-[80px] h-[80px] object-cover rounded border"
                                    />
                                    <button
                                        onClick={() => deletePhoto(index)}
                                        className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {imgs && (
                    <div className="mt-[5vh]">
                        <p className="text-center mb-4 font-medium">
                            {imgs.length} file{imgs.length > 1 ? 's' : ''} selected
                        </p>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-4 ">
                            {Array.from(imgs).map((img,index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={URL.createObjectURL(img)}
                                        alt={`Preview ${index + 1}`}
                                        className="w-[80px] h-[80px] object-cover rounded border"
                                    />
                                    <p className="text-xs text-center mt-1 truncate">
                                        {img.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleSubmit} 
                    disabled={uploading || totalImages === 0}
                    className={`px-[90px] md:px-[110px] py-[10px] text-accent text-[25px] font-poppins rounded-lg mt-[30px] transition duration-300 ease-in-out transform cursor-pointer ${
                        uploading || totalImages === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-main hover:bg-complementary hover:scale-105'
                    }`}
                >
                    {uploading ? 'Processing...' : `Start Analysis (${totalImages} images)`}
                </button>

                {uploading && (
                    <div className="mt-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main mx-auto"></div>
                        <p className="mt-2 text-gray-600">Uploading images and starting analysis...</p>
                    </div>
                )}
            </div>
         </section>
        </>
    )
}
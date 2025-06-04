import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";
import FileIcon from "../assets/file.png";
import CameraComponent from "../components/CameraComponent";

export default function UploadPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { firstName, lastName, tel, sex } = location.state || {};

    const { token, uploadCall } = useAuth(); // ✅ Add uploadCall
    const [uploading, setUploading] = useState(false);
    // ❌ REMOVE: const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    // Modal and Camera state (only for mobile)
    const [showModal, setShowModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const fileInputRef = useRef(null);

    const [imgs, setImgs] = useState(null);
    const [imgErrror, setImgError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const totalImages = (imgs ? imgs.length : 0) + capturedPhotos.length;
        if (totalImages === 0) {
            setImgError("Please select at least one image or take photos");
            return;
        }

        setUploading(true);
        const formData = new FormData();

        capturedPhotos.forEach((photo, index) => {
            formData.append("files", photo, `captured_${index}.jpg`);
        });

        if (imgs) {
            for (let i = 0; i < imgs.length; i++) {
                formData.append("files", imgs[i]);
            }
        }

        const fullName = `${firstName || ""} ${lastName || ""}`.trim();
        formData.append("patientName", fullName);
        formData.append("tel", tel || "");
        formData.append("sex", sex || "");

        const date = new Date().toISOString();
        formData.append("date", date);

        // ✅ ADD DEBUG LOGS
        console.log('🚀 About to upload with FormData:');
        for (let [key, value] of formData.entries()) {
            console.log(`🚀 ${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
        }

        try {
            console.log('🚀 Calling uploadCall...');
            // ✅ CHANGED: Use uploadCall instead of direct fetch
            const response = await uploadCall(formData);
            console.log('🚀 Upload response status:', response.status);

            if (response.status === 401) {
                localStorage.removeItem('token');
                alert('Session expired. Please login again.');
                navigate('/login');
                return;
            }

            // Replace the error handling section (around line 70):

        if (!response.ok) {
            console.log('🚨 Response status:', response.status);
            console.log('🚨 Response headers:', Object.fromEntries(response.headers.entries()));
            
            const errorText = await response.text();
            console.log('🚨 Raw error response:', errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
                console.log('🚨 Parsed error data:', errorData);
            } catch (parseError) {
                console.log('🚨 Could not parse error as JSON');
                errorData = { error: errorText };
            }
            
            console.error("Upload failed:", errorData);
            
            // Show detailed error message
            const errorMessage = errorData.detail || errorData.error || errorData.message || 'Unknown error';
            setImgError(`Upload failed: ${errorMessage}`);
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

    // ... rest of your component stays exactly the same
    const handleImageChange = (e) => {
        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        const files = e.target.files;

        if (files.length === 0) {
            setImgError("");
            setImgs(null);
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!validTypes.includes(file.type)) {
                return setImgError("Only JPG, JPEG, and PNG formats allowed.");
            }
            if (file.size > 5 * 1024 * 1024) {
                return setImgError("Image size must be under 5MB.");
            }
        }
        setImgs(files);
        setImgError('');
        setShowModal(false);
    };

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);
    const openFileDialog = () => fileInputRef.current?.click();

    // Camera
    const handleAddPhoto = (photo) => {
        setCapturedPhotos(prev => [...prev, photo]);
    };

    const deletePhoto = (index) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const totalImages = (imgs ? imgs.length : 0) + capturedPhotos.length;

    return (
        <>
            <Logo showHomeButton={true} />
            <section className="mt-[40px] min-h-screen m-[20px]">
                <div className="px-[2vw] flex flex-col justify-center items-center mt-[50px]">
                    <h1 className="text-[30px] md:text-5xl font-poppins font-[400] text-main mb-3">Upload Images</h1>
                    <p className="text-center mt-[10px] text-[16px] md:text-[19px] mb-[25px] text-complementary font-['Kelly_Slab']">
                        Upload atleast 10 clear microscopic images of blood smears for malaria detection.
                    </p>

                    {/* Mobile: Single Button with Modal */}
                    <div className="md:hidden w-[60%] mb-8">
                        <button
                            onClick={openModal}
                            disabled={uploading}
                            className="w-full py-[50px] rounded-[20px] border border-dashed border-black flex flex-col items-center justify-center hover:border-main transition-colors bg-transparent disabled:bg-gray-100"
                        >
                            <img src={FileIcon} alt="Upload files" className="w-16 h-16 mb-2" />
                            <span className="text-[16px] text-main font-['Kelly_Slab']">Add Images</span>
                        </button>
                    </div>

                    {/* Desktop: File Upload Only */}
                    <div className="hidden md:flex justify-center w-full max-w-4xl">
                        <div className="relative w-[60%] md:w-[40%]">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={uploading}
                            />
                            <div className="py-[70px] rounded-[20px] border border-dashed border-black flex flex-col items-center justify-center hover:border-main transition-colors">
                                <img src={FileIcon} alt="Upload files" className="w-16 h-16 mb-2" />
                                <span className="text-[18px] text-main">Choose Files</span>
                            </div>
                        </div>
                    </div>

                    {/* Hidden File Input for Mobile */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={uploading}
                    />

                    {imgErrror && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {imgErrror}
                        </div>
                    )}

                    {/* Show captured photos */}
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
                                {Array.from(imgs).map((img, index) => (
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
                        className={`w-[60%] md:w-[25vw]  py-3 text-accent text-md font-poppins rounded-lg mt-[30px] transition duration-300 ease-in-out transform cursor-pointer ${
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

                {/* Modal - ONLY shows on mobile */}
                {showModal && (
                    <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
                            <h2 className="text-xl font-poppins text-main mb-4 text-center">Choose Upload Method</h2>
                            <div className="flex flex-col items-center">
                                <div className="flex gap-5 justify-center mb-6">
                                    <button
                                        onClick={openFileDialog}
                                        className="py-2 px-6 bg-main bg-opacity-55 text-white rounded-lg hover:bg-opacity-70 transition-colors font-['Kelly_Slab'] text-[16px]"
                                    >
                                        Browse Files
                                    </button>
                                    <button
                                        onClick={() => { setShowModal(false); setShowCamera(true); }}
                                        className="py-2 px-6 bg-main bg-opacity-55 text-white rounded-lg hover:bg-opacity-70 transition-colors font-['Kelly_Slab'] text-[16px]"
                                    >
                                        Take Photo
                                    </button>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="w-[80%] py-2 px-6 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-['Kelly_Slab']"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CameraComponent Modal */}
                <CameraComponent
                    isOpen={showCamera}
                    onClose={() => setShowCamera(false)}
                    onPhotoAdd={handleAddPhoto}
                />
            </section>
        </>
    );
}
import { useState } from "react";
import { useNavigate } from "react-router";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

export default function UploadPage(){
    const navigate = useNavigate();
    const { token } = useAuth();
    const [uploading, setUploading] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imgs || imgs.length === 0) {
            setImgError("Please select at least one image");
            return;
        }
        
        setUploading(true);
        const formData = new FormData();

        // Append files with the exact name your backend expects
        for (let i = 0; i < imgs.length; i++) {
            formData.append("files", imgs[i]);
        }

        // Append form data with exact field names from backend
        formData.append("patientName", patientName || "");
        formData.append("date", date || "");

        try {
            const response = await fetch("http://localhost:8000/submit", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type when using FormData
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

    // Rest of your component logic stays the same
    const [textInput, setTextInput] = useState({
        patientName: "",
        date: "",
    });

    const [imgs, setImgs] = useState(null);
    const [imgErrror, setImgError] = useState("")

    const {patientName, date} = textInput

    const handleChange = (e) => {
        const {name, value} = e.target;
        setTextInput({...textInput, [name]: value })
    }

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
          if(file.size > 5 * 1024 * 1024){ // Increased to 5MB for microscopy images
            return setImgError("Image size must be under 5MB.")
          }
        }
        setImgs(files);
        setImgError('');
    }

    return(
        <>
        <Logo showHomeButton={true}/>
         <section className="mt-[40px] min-h-screen m-[20px]">
            <div className="flex flex-col md:flex-row justify-around p-[20px] gap-[10px]"> 
                <div className="flex flex-col gap-[5px] w-[300px]">
                    <label htmlFor="patients-name" className="text-[16px] md:text-[18px] font-[500]">Patient's Name</label>
                    <input 
                        type="text" 
                        name="patientName" 
                        value={patientName} 
                        onChange={handleChange} 
                        placeholder="Patient's name (optional)" 
                        className="py-3 px-10 rounded-lg border border-txt focus:outline-none focus:ring-1 focus:ring-complementary transition text-[12px] md:text-[15px] font-roboto"
                        disabled={uploading}
                    />
                </div>

                <div className="flex flex-col gap-[5px] w-[300px]">
                    <label htmlFor="date" className="text-[16px] md:text-[18px] font-[500]">Date</label>
                    <input 
                        type="date" 
                        name="date" 
                        value={date} 
                        onChange={handleChange} 
                        className="py-3 px-10 rounded-lg border focus:outline-none focus:ring-1 focus:ring-complementary transition text-[12px] md:text-[15px] font-roboto"
                        disabled={uploading}
                    />
                </div>
            </div>

            <div className="px-[2vw] flex flex-col justify-center items-center mt-[50px]">
                <h1 className="text-[30px] md:text-[35px] font-poppins font-[600]">Upload Images</h1>
                <p className="text-center mt-[10px] text-[16px] md:text-[19px]">Upload clear microscopic images of blood smears for malaria detection.</p>

                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageChange} 
                    className="px-[2vw] py-[100px] mt-[20px] rounded-[20px] border border-dashed focus:outline-none focus:ring-1 focus:ring-main transition text-[16px] md:text-[18px]" 
                    required
                    disabled={uploading}
                />

                {imgErrror && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {imgErrror}
                    </div>
                )}

                {imgs && (
                    <div className="mt-[5vh]">
                        <p className="text-center mb-4 font-medium">
                            {imgs.length} image{imgs.length > 1 ? 's' : ''} selected
                        </p>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
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
                    disabled={uploading || !imgs || imgs.length === 0}
                    className={`px-[90px] md:px-[110px] py-[10px] text-accent text-[25px] font-poppins rounded-lg mt-[30px] transition duration-300 ease-in-out transform cursor-pointer ${
                        uploading || !imgs || imgs.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-main hover:bg-complementary hover:scale-105'
                    }`}
                >
                    {uploading ? 'Processing...' : 'Start Analysis'}
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
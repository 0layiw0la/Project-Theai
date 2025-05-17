import { useState } from "react";
import { useNavigate } from "react-router";
import Logo from "../components/Logo";


export default function UploadPage(){
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imgs || imgs.length === 0) return;
    const formData = new FormData();

    for (let i = 0; i < imgs.length; i++) {
        formData.append("files", imgs[i]);
    }

    formData.append("patientName", patientName);
    formData.append("date", date);

    try {
        const response = await fetch("http://127.0.0.1:8000/submit", {
        method: "POST",
        body: formData
        });
        if (!response.ok) {
        console.error("Upload failed");
        return;
        }
        console.log("Upload succeeded");
        const data = await response.json();
        navigate(`/tasks`);
    } catch (error) {
        console.error(error);
    }
    
    };


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
        for (let i = 0; i < files.length; i++){
           const file = files[i]
           
           if(!validTypes.includes(file.type)){
             return setImgError("Only JPG, JPEG, and PNG formats allowed.")
          }
          if(file.size > 2 * 1024 * 1024){
            return setImgError("Image size must be under 2MB.")
          }
        }
        setImgs(files);
        setImgError('');
        
    }
    return(
        <>
        <Logo />
         <section className="mt-[40px] min-h-screen m-[20px]">
            <div className="flex flex-col md:flex-row justify-around p-[20px] gap-[10px]"> 
                <div className="flex flex-col gap-[5px] w-[300px]">
                    <label htmlFor="patients-name" className="text-[16px] md:text-[18px] font-[500]">Patient's Name</label>
                    <input type="text" name="patientName" value={patientName} onChange={handleChange} placeholder="patient's name" className="py-3 px-10 rounded-lg border border-txt focus:outline-none focus:ring-1 focus:ring-complementary transition text-[12px] md:text-[15px] font-roboto"/>
                </div>

                <div className="flex flex-col gap-[5px] w-[300px]">
                    <label htmlFor="date" className="text-[16px] md:text-[18px] font-[500]">Date</label>
                    <input type="date" name="date" value={date} onChange={handleChange} className="py-3 px-10 rounded-lg border focus:outline-none focus:ring-1 focus:ring-complementary transition text-[12px] md:text-[15px] font-roboto"/>
                </div>
            </div>

            <div className="px-[2vw] flex flex-col justify-center items-center mt-[50px]">
                <h1 className="text-[30px] md:text-[35px] font-poppins font-[600]">Upload Image</h1>
                <p className="text-center mt-[10px] text-[16px] md:text-[19px]">Upload a clear microscopic image of the blood smear.</p>

                <input type="file" accept="image/*" multiple onChange={handleImageChange} className="px-[2vw] py-[100px] mt-[20px] rounded-[20px] border border-dashed focus:outline-none focus:ring-1 focus:ring-main transition text-[16px] md:text-[18px]" required/>

                {imgs && (
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-4 mt-[5vh]">
                        {Array.from(imgs).map((img,index) => (
                            <img
                            key = {index}
                            src = {URL.createObjectURL(img)}
                            alt="preview"
                            className = "w-[50px] h-auto" />
                        ))}
                     </div>
                )}

                <button onClick={handleSubmit} className="px-[90px] md:px-[110px] py-[10px] bg-main text-accent text-[25px] font-poppins rounded-lg mt-[30px] hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer">Start Analysis</button>
            </div>
         </section>
        </>
    )
}
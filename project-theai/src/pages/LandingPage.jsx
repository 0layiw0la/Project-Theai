import { useNavigate } from "react-router";
import Logo from "../components/Logo";

export default function LandingPage(){
    const navigate = useNavigate();


    return(
        <>
        <Logo />
        <section className="min-h-screen flex flex-col justify-center items-center gap-[120px] md:gap-[80px]">
            <div className="text-center flex flex-col md:flex-row md:gap-[10px]">
            <   h3 className=" text-[50px] text-center">Welcome to</h3>
                <p className="text-[30px] md:text-[50px] font-script text-main">Project Theai</p>
            </div>
            <div className="flex gap-20">
                <button className="w-[180px] py-[20px] bg-main text-accent text-[20px] font-poppins rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer" onClick={() => navigate("/upload")}>+ New Test</button>
                <button className="w-[180px] py-[20px] bg-main text-accent text-[20px] font-poppins rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer" onClick={() => navigate("/tasks")}>Existing Tests</button>
            </div>
        </section>
        </>
    )
}
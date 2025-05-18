import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

export default function LandingPage(){
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return(
        <>
        <Logo  showHomeButton={false}/>
        
        <section className="flex flex-col justify-center items-center gap-[100px] md:gap-[80px] mt-[20vh]">
            <div className="text-center flex flex-col lg:flex-row md:gap-[10px]">
                <h3 className="text-4xl md:text-6xl text-center">Welcome to</h3>
                <p className="text-5xl md:text-7xl lg:text-6xl font-script text-main">Project Theia</p>
            </div>
            <div className="flex gap-7">
                <button className="w-[40vw] md:w-[30vw] lg:w-[20vw] py-[20px] bg-main text-accent text-lg font-poppins rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer" onClick={() => navigate("/upload")}>+ New Test</button>
                <button className="w-[40vw] md:w-[30vw] lg:w-[20vw] py-[20px] bg-main text-accent text-[20px] font-poppins rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer" onClick={() => navigate("/tasks")}>Existing Tests</button>
            </div>
        </section>
        <div className="absolute bottom-5 right-5">
            <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 rounded-md"
            >
                Logout
            </button>
        </div>
        </>
    );
}
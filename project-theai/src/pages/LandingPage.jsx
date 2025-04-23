import { useNavigate } from "react-router"

export default function LandingPage(){
    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/upload")
    }

    return(
        <>
        <section className="min-h-screen flex flex-col justify-center items-center gap-[120px] md:gap-[80px]">
            <div className="text-center flex flex-col md:flex-row md:gap-[10px]">
            <h3 className=" text-[50px] text-center">Welcome to</h3>
            <p className="text-[30px] md:text-[50px] font-script text-main">Project Theai</p>
            </div>
            <button className="px-[60px] py-[20px] bg-main text-accent text-[25px] font-poppins rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer" onClick={handleClick}>Get Started</button>
        </section>
        </>
    )
}
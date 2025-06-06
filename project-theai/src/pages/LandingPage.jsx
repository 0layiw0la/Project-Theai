import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";
import plusIcon from "../assets/plus-icon.png"

export default function LandingPage(){
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
      <>
        <Logo showHomeButton={false} />

        <section className="flex flex-col justify-center items-center gap-[100px] md:gap-[80px] mt-[7vh] md:mt-[17vh] p-5">
          <div className="flex flex-col gap-[20px]">
            <div className="text-center text-[30px] md:text-6xl flex flex-col lg:flex-row md:gap-[10px] font-poppins">
              <h3 className="text-center">WELCOME TO PROJECT <span className="text-main">THEIA.</span></h3>
            </div>
            <p className="font-['Kelly_Slab'] text-[20px] md:text-[25px] text-center text-complementary">
              AI-powered malaria diagnosis at your fingertips...
            </p>
          </div>
          <div className="flex gap-[40px]">
            <button
              className="flex gap-2 px-[3vw] md:px-[2.5vw] py-[12px] bg-main text-accent text-[18px] md:text-[24px] font-['Kelly_Slab'] rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer items-center"
              onClick={() => navigate("/form")}
            >
             <img src={plusIcon} alt="plus-icon" className="w-4 md:w-6 h-[18px] md:h-[24px]"/>
               New Test
            </button>
            <button
              className=" px-[3vw] md:px-[2.5vw] py-[12px] bg-main text-accent text-[18px] md:text-[24px] font-['Kelly_Slab'] rounded-lg hover:bg-complementary transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
              onClick={() => navigate("/tasks")}
            >
              Existing Tests
            </button>
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
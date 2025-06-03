import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import home from '../assets/home.png';

export default function Logo({ showHomeButton = false }) {
    const navigate = useNavigate();
    
    return (
        <div className='w-[95vw] mt-[5vh] flex justify-between items-center md:px-5'>
            {showHomeButton && (
                <button 
                    onClick={() => navigate('/')}
                    className="ml-5 px-4 py-2 flex items-center hover:bg-gray-200 rounded-md"
                >
                    <img src={home} alt="Home" className="w-5 h-5 md:w-7 md:h-7 mr-2" />
                    <span className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Home</span>
                </button>
            )}
            <div className={`${showHomeButton ? 'ml-auto' : 'mr-auto'} px-5`}>
                <img src={logo} alt="Logo" className='w-[100px] md:w-[150px] h-auto'/>
            </div>
        </div>
    );
}
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import home from '../assets/home.png';

export default function Logo({ showHomeButton = false }) {
    const navigate = useNavigate();
    
    return (
        <div className='w-[95vw] mt-[5vh] flex justify-between items-center'>
            {showHomeButton && (
                <button 
                    onClick={() => navigate('/')}
                    className="ml-5 px-4 py-2 flex items-center bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                    <img src={home} alt="Home" className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium text-black">Home</span>
                </button>
            )}
            <div className={showHomeButton ? '' : 'ml-auto'}>
                <img src={logo} alt="Logo" className='w-[100px] md:w-[150px] h-auto'/>
            </div>
        </div>
    );
}
import logo from '../assets/logo.jpg';


export default function Logo() {
    return (
        <div className='w-[95vw] mt-[5vh] flex justify-end'>
            <img src={logo} alt="Logo" className='w-[100px] md:w-[150px] h-auto'/>
        </div>
    );
}
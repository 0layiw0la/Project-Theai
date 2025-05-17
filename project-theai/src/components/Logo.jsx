import logo from '../assets/logo.jpg';


export default function Logo() {
    return (
        <div className='w-[97vw] mt-[5vh] flex justify-end '>
            <img src={logo} alt="Logo" className='w-[7vw] md:w-[10vw] h-auto'/>
        </div>
    );
}
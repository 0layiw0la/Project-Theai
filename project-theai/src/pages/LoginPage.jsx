import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.svg';
import LoginImg from "../assets/login-img.png"

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-transparent">
        <div className="lg:w-[45%] hidden lg:block">
          <img src={LoginImg} alt='login-image' className="h-full w-full object-cover object-top"/>
        </div>
        <div className="flex flex-col justify-center px-[30px] md:px-[80px] py-4 bg-transparent lg:w-[55%] overflow-y-auto">
          <div className='flex justify-center items-center mb-[20px] mt-8'>
            <img src={Logo} className='w-[120px] md:w-[150px]'/>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-[400] font-poppins text-main">Login</h1>
            <p className="mt-2 text-gray-600 font-['Kelly_Slab'] text-[16px] md:text-[20px]">Sign in to your account</p>
          </div>
          
          {error && (
            <div className="p-4 text-red-700 bg-red-100 rounded-md mt-4">
              {error}
            </div>
          )}
          
          <form className="mt-6 space-y-5 max-w-md mx-auto w-full" onSubmit={handleSubmit}>
             <div className='flex flex-col gap-2'>
              <label htmlFor='username' className="text-[18px] md:text-[20px] font-400 text-main font-['Kelly_Slab']">Username:</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-4 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300 focus:bg-transparent"
                placeholder="Username"
              />
            </div>
            
            <div className='flex flex-col gap-2'>
              <label htmlFor='password' className="text-[18px] md:text-[20px] font-400 text-main font-['Kelly_Slab']">Password:</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-4 border border-gray-300 rounded-md focus:outline-none focus:border-gray-300 bg-transparent"
                placeholder="Password"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-main text-accent text-[16px] md:text-[18px] font-['Kelly_Slab'] rounded-md hover:bg-complementary focus:outline-none focus:bg-complementary transition duration-200"
              >
                Sign in
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4 font-['Kelly_Slab'] text-[16px] md:text-[18px] max-w-md mx-auto">
            <p>
              Don't have an account?{' '}
              <button 
                onClick={() => navigate('/register')}
                className="text-main hover:text-complementary cursor-pointer"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
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
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="lg:w-1/2 hidden lg:block">
          <img src={LoginImg} alt='login-image' className="h-screen w-full"/>
        </div>
        <div className="block px-[30px] md:px-[80px] py-8 bg-white lg:w-1/2">
        <div className='flex justify-center items-center mb-[40px] mt-10'>
          <img src={Logo} className='w-[150px] md:w-[200px] '/>
        </div>
          <div className="text-center">
            <h1 className="text-3xl font-[400] font-poppins text-main">Login</h1>
            <p className="mt-2 text-gray-600 font-['Kelly_Slab'] text-[16px] md:text-[20px]">Sign in to your account</p>
          </div>
          
          {error && (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
             <div className='flex flex-col gap-2'>
              <label htmlFor='username' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Username:</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Username"
              />
            </div>
            
            <div className='flex flex-col gap-2'>
              <label htmlFor='password' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Password:</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Password"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-main text-accent text-[16px] md:text-[20px] font-['Kelly_Slab'] rounded-md hover:bg-complementary focus:outline-none focus:bg-complementary"
              >
                Sign in
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4 font-['Kelly_Slab'] text-[16px] md:text-[18px]">
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
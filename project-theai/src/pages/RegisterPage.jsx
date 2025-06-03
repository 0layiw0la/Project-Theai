import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../assets/logo.svg';
import SignUpImg from "../assets/sign-up-img.png"

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      const success = await register(username, email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-transparent">
        <div className="flex flex-col justify-center px-[30px] md:px-[80px] bg-transparent lg:w-[55%]">
          <div className='flex justify-center items-center mb-[15px]'>
            <img src={Logo} className='w-[100px] mt-[5vh] md:mt-0 md:w-[120px]'/>
          </div>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-[400] font-poppins text-main">Register</h1>
            <p className="mt-1 text-gray-600 font-['Kelly_Slab'] text-[14px] md:text-[18px]">Create a new account</p>
          </div>
          
          {error && (
            <div className="p-3 text-red-700 bg-red-100 rounded-md mt-3">
              {error}
            </div>
          )}
          
          <form className="mt-4 space-y-3 max-w-md mx-auto w-full" onSubmit={handleSubmit}>
            <div className='flex flex-col gap-1'>
              <label htmlFor='username' className="text-[16px] md:text-[18px] font-400 text-main font-['Kelly_Slab']">Username:</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary bg-transparent focus:bg-transparent"
                placeholder="Username"
              />
            </div>

            <div className='flex flex-col gap-1'>
              <label htmlFor='email' className="text-[16px] md:text-[18px] font-400 text-main font-['Kelly_Slab']">Email:</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary bg-transparent focus:bg-transparent"
                placeholder="Email"
              />
            </div>

            <div className='flex flex-col gap-1'>
              <label htmlFor='password' className="text-[16px] md:text-[18px] font-400 text-main font-['Kelly_Slab']">Password:</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary bg-transparent focus:bg-transparent"
                placeholder="Password"
              />
            </div>

            <div className='flex flex-col gap-1'>
              <label htmlFor='confirmPassword' className="text-[16px] md:text-[18px] font-400 text-main font-['Kelly_Slab']">Confirm Password:</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary bg-transparent focus:bg-transparent"
                placeholder="Confirm Password"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-main text-accent text-[14px] md:text-[16px] font-['Kelly_Slab'] rounded-md hover:bg-complementary focus:outline-none focus:bg-complementary transition duration-200"
              >
                Register
              </button>
            </div>
          </form>
          
          <div className="text-center mt-3 font-['Kelly_Slab'] text-[14px] md:text-[16px] max-w-md mx-auto">
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => navigate('/login')}
                className="text-main hover:text-complementary cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
        <div className="lg:w-[45%] hidden lg:block">
          <img src={SignUpImg} alt='signup-image' className="min-h-full w-full object-cover object-top"/>
        </div>
      </div>
  );
}
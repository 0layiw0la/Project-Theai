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
    <>
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="block px-[30px] md:px-[80px] py-8 bg-white lg:w-1/2">
          <div className="flex justify-center items-center mb-7 mt-3">
            <img src={Logo} className="w-[150px] md:w-[200px] " />
          </div>

          <div className="text-center mt-3">
            {/* <h1 className="text-3xl mt-2 font-[400] font-poppins text-main">Register</h1> */}
            <p className="text-gray-600 font-['Kelly_Slab'] text-[20px] md:text-[30px]">Create a new account</p>
          </div>

          {error && (
            <div className="p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
            <div className='flex flex-col'>
              <label htmlFor='username' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Username:</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Username"
              />
            </div>

             <div className='flex flex-col'>
              <label htmlFor='email' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Email:</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Email"
              />
            </div>

             <div className='flex flex-col'>
              <label htmlFor='password' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Password:</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Password"
              />
            </div>

            <div className='flex flex-col gap-2'>
              <label htmlFor='confirm-password' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Confirm Password:</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full font-['Kelly_Slab'] py-3 px-5 border border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
                placeholder="Confirm Password"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-white bg-main text-[16px] md:text-[20px] font-['Kelly_Slab'] rounded-md hover:bg-complementary focus:outline-none focus:bg-complementary"
              >
                Register
              </button>
            </div>
          </form>

          <div className="text-center mt-4 font-['Kelly_Slab'] text-[16px] md:text-[18px]">
            <p>
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-main hover:text-complementary cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <div className="lg:w-1/2 hidden lg:block">
          <img src={SignUpImg} alt="signup-image" className="h-screen w-full" />
        </div>
      </div>
    </>
  );
}
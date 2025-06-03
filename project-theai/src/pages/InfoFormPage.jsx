import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function InfoFormPage() {
  const [formData, setFormData] = useState({ 
    firstName: "", 
    lastName: "", 
    tel: "" 
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/upload', { state: formData });
  };

  return (
    <>
    <Logo showHomeButton={true}/>
    <div className="p-10 lg:px-[150px] flex flex-col justify-center items-center">
      <h1 className="text-2xl font-[400] mb-6 text-center font-poppins text-main md:text-5xl">Fill in Patient's Information</h1>
      <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-5">
        <div className='flex flex-col gap-4'>
        <label htmlFor='patient name' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Patient's Name</label>
        <div className='flex flex-col md:flex-row justify-between gap-[20px] md:gap-[50px]'>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="border py-3 px-5 rounded font-['Kelly_Slab'] border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="border py-3 px-5 rounded font-['Kelly_Slab'] border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
          required
        />
        </div>
        </div>
        <div className='flex flex-col gap-4'>
        <label htmlFor='patient tel' className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Patient Phone No.:</label>
        <input
          type="number"
          name="tel"
          placeholder="Phone Number"
          value={formData.tel}
          onChange={handleChange}
          className="border py-3 px-5 rounded font-['Kelly_Slab'] border-gray-300 rounded-md focus:outline-none focus:ring-complementary focus:border-complementary"
          required
        />
        </div>
        <button
          type="submit"
          className="px-[90px] md:px-[110px] py-[10px] text-accent text-[22px] md:text-[25px] font-['Kelly_Slab'] rounded-lg mt-[30px] transition duration-300 ease-in-out transform cursor-pointer bg-main hover:bg-complementary hover:scale-105"
        >
          Proceed
        </button>
      </form>
    </div>
    </>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function InfoFormPage() {
  const [formData, setFormData] = useState({ 
    firstName: "", 
    lastName: "", 
    tel: "",
    sex: ""
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
    <div className="p-10 mt-[5vh] md:mt-0 lg:px-[150px] flex flex-col justify-center items-center">
      <h1 className="text-2xl font-[400] mb-6 text-center font-poppins text-main md:text-5xl">Fill in Patient's Information</h1>
      <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-5">
        <div className='flex flex-col gap-4'>
        
        {/* ✅ UPDATED: Phone first (larger), then Sex (smaller) with equal heights */}
        <div className='flex flex-col md:flex-row justify-between gap-[15px] md:gap-[30px]'>
          <div className='flex flex-col gap-4 flex-3'>
            <label className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Patient Phone No.:</label>
            <input
              type="tel"
              name="tel"
              placeholder="Phone Number"
              value={formData.tel}
              onChange={handleChange}
              className="border border-[#055B5D] py-3 px-5 rounded font-['Kelly_Slab'] h-[52px]"
              required
            />
          </div>

          <div className='flex flex-col gap-4 flex-1'>
            <label className="text-[18px] md:text-[22px] font-400 text-main font-['Kelly_Slab']">Sex</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="border border-[#055B5D] py-3 px-5 rounded font-['Kelly_Slab'] bg-transparent h-[52px]"
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

        </div>

        <button
          type="submit"
          className="px-[90px] self-center md:px-[60px] md:w-[45%]  py-[10px] text-accent text-[25px] font-['Kelly_Slab'] rounded-lg mt-[30px] transition duration-300 ease-in-out transform cursor-pointer bg-main hover:bg-complementary hover:scale-105"
        >
          Proceed
        </button>
      </form>
    </div>
    </>
  );
}
import { Routes, Route } from "react-router"
import LandingPage from "../pages/LandingPage"
import UploadPage from "../pages/UploadPage"

export default function GeneralRouter(){

    return(
        <>
        <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/upload" element={<UploadPage/>}/>
        </Routes>
        </>
    )
}
import { Routes, Route } from "react-router"
import LandingPage from "../pages/LandingPage"

export default function GeneralRouter(){

    return(
        <>
        <Routes>
            <Route path="/" element={<LandingPage/>}/>
        </Routes>
        </>
    )
}
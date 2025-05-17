import { Routes, Route } from "react-router"
import LandingPage from "../pages/LandingPage"
import UploadPage from "../pages/UploadPage"
import TasksPage from "../pages/TasksPage";

export default function GeneralRouter(){

    return(
        <>
        <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/upload" element={<UploadPage/>}/>
            <Route path="/tasks" element={<TasksPage/>}/>
        </Routes>
        </>
    )
}

import { Outlet } from "react-router-dom";
import NavBar from "../Components/navbar"

function AdminLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}

export default AdminLayout;
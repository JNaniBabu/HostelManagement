import TenantNabar from "../StudentComponent/tenantNavbar";
import { Outlet } from "react-router-dom";
import styles from '../StudentComponent/student.module.css'

function TenantLayout() {
  return (
    <div className={styles.tenantparent}>
      <TenantNabar />
      <Outlet />
    </div>
  );
}

export default TenantLayout;
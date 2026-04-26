
import { HiUserAdd } from "react-icons/hi";
import { MdPayments } from "react-icons/md";
import { MdReportProblem } from "react-icons/md";
import { MdBed } from "react-icons/md";
import { MdOutlineGroups } from "react-icons/md";
import { MdOutlineVerifiedUser } from "react-icons/md";

import NewJoinee from "./NewJoinee";
import Pending from "./Pending";
import TotalTenants from "./TotalTenants";
import Vacancy from "./Vacancy";
import Upcoming from "./Upcoming";
import Complaints from "./Complaints";

import { useState } from "react";

function MainPortion() {
    const[PresentContent,setPresentContent]=useState(false)
    const [Number,setNumber]=useState(0)
    const Parts=[<NewJoinee></NewJoinee>,<Pending></Pending>,<Vacancy></Vacancy>,<Upcoming></Upcoming>,<TotalTenants></TotalTenants>,<Complaints></Complaints>]


    return <div className="mainPortion">
        <div className="analytics" >
         
            <div className={`newJoinee box ${Number === 0 ? "active" : ""}`} onClick={()=>{setPresentContent((p)=> !p? !p : p)
                                               setNumber(0)

            }} onDoubleClick={()=>setPresentContent(false)} >
              <HiUserAdd className="icons"></HiUserAdd>
              <h4>New Tenant</h4>
            </div>
            <div className={`Verfication box ${Number === 1 ? "active" : ""}`}  onClick={()=>{setPresentContent((p)=> !p? !p : p)
                setNumber(1)
            }} onDoubleClick={()=>setPresentContent(false)}>
              <MdOutlineVerifiedUser className="icons"></MdOutlineVerifiedUser>
              <h4>Pending Verfication</h4>
            </div>
          
         
            <div className={`vacancies box ${Number === 2 ? "active" : ""}`}  onClick={()=>{setPresentContent((p)=> !p? !p : p)
                setNumber(2)
            }} onDoubleClick={()=>setPresentContent(false)} >
              <MdBed className="icons"></MdBed>
              <h4>Vacancy Rooms</h4>
            </div>
            <div className={`Upcoming box ${Number === 3 ? "active" : ""}`}  onClick={()=>{setPresentContent((p)=> !p? !p : p)
                setNumber(3)
            }} onDoubleClick={()=>setPresentContent(false)} >
              <MdPayments className="icons"></MdPayments>
              <h4>Upcoming Fees</h4>
            </div>
         

         
            <div className={`Total box ${Number === 4 ? "active" : ""}`}  onClick={()=>{setPresentContent((p)=> !p? !p : p)
                setNumber(4)
            }} onDoubleClick={()=>setPresentContent(false)} >
              <MdOutlineGroups className="icons"></MdOutlineGroups>
              <h4>Total Tenants</h4>
            </div>
            <div className={`complaints box ${Number === 5 ? "active" : ""}`}  onClick={()=>{setPresentContent((p)=> !p? !p : p)
                setNumber(5)
            }} onDoubleClick={()=>setPresentContent(false)} >
              <MdReportProblem className="icons"></MdReportProblem>
              <h4>Complaints</h4>
            </div>
        
        </div>
      <div className="result" >

         {Parts[Number]}
      </div>
      </div>
}
export default MainPortion

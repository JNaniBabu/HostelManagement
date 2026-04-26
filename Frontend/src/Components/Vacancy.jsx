import { useEffect, useState } from "react";

import Loader from "../Loader";
import { authFetch, getCookie } from "../utils/authFetch";

function Vacancy() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchVacancyRooms() {
    try {
      const response = await authFetch("http://localhost:8000/vacancyrooms/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          xsrfToken: getCookie("csrftoken"),
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRooms(data);
      } else {
        console.log("Failed to fetch rooms");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVacancyRooms();
  }, []);

  return (
    <div className="Vacancy">
      <h3 className="vacancyTitle">Vacancy Rooms</h3>

      <div className="vacancylist">
        {loading ? (
          <div className="vacancyLoaderWrap">
            <Loader />
          </div>
        ) : (
          <>
            {rooms.length === 0 && (
              <p className="vacancyEmpty">No vacancy rooms available right now.</p>
            )}

            {rooms.map((room, index) => {
              const availableBeds = room.total_capacity - room.occupied;
              const bedsClass =
                availableBeds > 1
                  ? "bedsHigh"
                  : availableBeds === 1
                    ? "bedsLow"
                    : "bedsFull";

              return (
                <div key={index} className="vacancycard">
                  <div className="vacancyCardTop">
                    <h4 className="vacancyRoomNumber">{room.room_number.toUpperCase()}</h4>
                    <p className="vacancyTypeBadge">{room.room_type}</p>
                  </div>

                  <div className="vacancyMeta">
                    <p className="vacancyRent">Rent: Rs. {room.rent}</p>

                    <p className="vacancyBeds">
                      <span className="vacancyBedsLabel">Available Beds:</span>
                      <span className={`vacancyBedsValue ${bedsClass}`}>{availableBeds}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default Vacancy;

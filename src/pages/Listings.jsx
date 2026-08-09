import { useEffect, useState } from "react";
import { fetchListings } from "../api/client";

export default function Listings() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchListings();

        setProperties(
          data.map((p) => ({
            ...p,
            id: p.unit_id,
          }))
        );
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  return (
    <main>
      <div className="page-head">
        <h1>Available Rentals</h1>
        <p>Browse homes for rent.</p>
      </div>

      <div className="grid grid-3">
        {properties.map((home) => (
          <div className="card property-card" key={home.id}>
            <div>
              <div className="addr">{home.address}</div>
              <div className="city">{home.city}</div>
            </div>

            <div className="property-meta">
              <span>{home.bedrooms} Bed</span>
              <span>{home.bathrooms} Bath</span>
            </div>

            <span className={`status-tag ${home.status}`}>
              {home.status === "occupied" ? "Occupied" : "Available"}
            </span>

            <div className="rent-line">
              ${Number(home.rent).toLocaleString()} / month
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
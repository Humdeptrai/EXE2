import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "./locationService";
import "./location.css";
export default function LocationMap({ place, onMove, accuracy }: { place: Place; onMove?: (latitude: number, longitude: number) => void; accuracy?: number }) {
  const element = useRef<HTMLDivElement>(null);
  const move = useRef(onMove); move.current = onMove;
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [tileError, setTileError] = useState(false);
  const key = import.meta.env.VITE_GEOAPIFY_MAP_KEY as string | undefined;
  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current, { scrollWheelZoom: false, zoomControl: true }).setView([10.7769, 106.7009], 12);
    mapRef.current = map;
    if (key) {
      const layer = L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>', maxZoom: 20,
      }).addTo(map);
      layer.on("tileerror", () => setTileError(true));
    }
    const icon = L.divIcon({ className: "hf-map-pin", html: '<span aria-hidden="true">●</span>', iconSize: [32, 40], iconAnchor: [16, 36] });
    const marker = L.marker([10.7769, 106.7009], { draggable: Boolean(move.current), icon, title: "Vị trí đã chọn" });
    markerRef.current = marker;
    marker.on("dragend", () => { const p = marker.getLatLng(); move.current?.(p.lat, p.lng); });
    map.on("click", event => { if (move.current) move.current(event.latlng.lat, event.latlng.lng); });
    const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(element.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [key]);
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker) return;
    if (place.latitude == null || place.longitude == null) { marker.remove(); return; }
    const p: L.LatLngExpression = [place.latitude, place.longitude]; marker.setLatLng(p).addTo(map);
    if (!map.getBounds().contains(p) || map.getZoom() < 15) map.setView(p, 16);
    circleRef.current?.remove();
    if (accuracy && accuracy > 0) circleRef.current = L.circle(p, { radius: accuracy, color: "#007f95", weight: 1, fillOpacity: .08 }).addTo(map);
  }, [place.latitude, place.longitude, accuracy]);
  return <div className="hf-map-wrap"><div ref={element} className="hf-location-map" aria-label="Bản đồ chọn vị trí" />{(!key || tileError) && <p role="status" className="hf-map-warning">{!key ? "Bản đồ nền chưa được cấu hình. Bạn vẫn có thể dùng địa chỉ đã lưu hoặc nhập tay." : "Không tải được một phần bản đồ. Hãy kiểm tra mạng hoặc dùng địa chỉ đã lưu / nhập tay."}</p>}</div>;
}

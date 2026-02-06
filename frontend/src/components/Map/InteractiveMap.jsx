import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './InteractiveMap.css';

// Corrigir ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const dengueIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDMwQzIzLjczMjQgMzAgMzAgMjMuNzMyNCAzMCAxNkMzMCA4LjI2NzU2IDIzLjczMjQgMiAxNiAyQzguMjY3NTYgMiAyIDguMjY3NTYgMiAxNkMyIDIzLjczMjQgOC4yNjc1NiAzMCAxNiAzMFoiIGZpbGw9IiNGRjZCNkIiLz4KPHBhdGggZD0iTTE2IDE4LjVDMTcuMzgwNyAxOC41IDE4LjUgMTcuMzgwNyAxOC41IDE2QzE4LjUgMTQuNjE5MyAxNy4zODA3IDEzLjUgMTYgMTMuNUMxNC42MTkzIDEzLjUgMTMuNSAxNC42MTkzIDEzLjUgMTZDMTMuNSAxNy4zODA3IDE0LjYxOTMgMTguNSAxNiAxOC41WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const InteractiveDengueMap = ({ outbreaks }) => {
  const center = [-15.793889, -47.882778]; // Centro do Brasil
  const zoom = 4;

  const getRadius = (cases) => {
    if (cases > 500) return 100000;
    if (cases > 200) return 70000;
    if (cases > 100) return 50000;
    return 30000;
  };

  const getColor = (cases) => {
    if (cases > 500) return '#ff0000';
    if (cases > 200) return '#ff6b6b';
    if (cases > 100) return '#ffd166';
    return '#06d6a0';
  };

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className="dengue-map"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {outbreaks.map((outbreak, index) => (
          <div key={index}>
            <Circle
              center={outbreak.coordinates}
              radius={getRadius(outbreak.cases)}
              pathOptions={{
                fillColor: getColor(outbreak.cases),
                color: getColor(outbreak.cases),
                fillOpacity: 0.3,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                <div style={{ fontWeight: 'bold' }}>
                  {outbreak.city}: {outbreak.cases} casos
                </div>
              </Tooltip>
            </Circle>
            
            <Marker position={outbreak.coordinates} icon={dengueIcon}>
              <Popup>
                <div className="map-popup">
                  <h3>{outbreak.city}</h3>
                  <p><strong>Casos:</strong> {outbreak.cases}</p>
                  <p><strong>Confirmados:</strong> {outbreak.confirmed || outbreak.cases * 0.7}</p>
                  <p><strong>Suspeitos:</strong> {outbreak.suspected || outbreak.cases * 0.3}</p>
                  <p><strong>Última atualização:</strong> {outbreak.lastUpdate}</p>
                  <button 
                    className="details-btn"
                    onClick={() => window.location.href = `/dashboard/casos?city=${outbreak.city}`}
                  >
                    Ver detalhes
                  </button>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
      
      <div className="map-legend">
        <h4>Legenda do Mapa</h4>
        <div className="legend-item">
          <div className="legend-circle" style={{ backgroundColor: '#06d6a0' }}></div>
          <span>Baixo risco (&lt; 100 casos)</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ backgroundColor: '#ffd166' }}></div>
          <span>Médio risco (100-200 casos)</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ backgroundColor: '#ff6b6b' }}></div>
          <span>Alto risco (200-500 casos)</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle" style={{ backgroundColor: '#ff0000' }}></div>
          <span>Crítico (&gt; 500 casos)</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDengueMap;
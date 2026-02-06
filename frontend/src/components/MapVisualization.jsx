import './css/MapVisualization.css';

const MapVisualization = () => {
  const regions = [
    { name: 'Norte', cases: 320, risk: 'high' },
    { name: 'Nordeste', cases: 450, risk: 'critical' },
    { name: 'Centro-Oeste', cases: 180, risk: 'medium' },
    { name: 'Sudeste', cases: 620, risk: 'critical' },
    { name: 'Sul', cases: 95, risk: 'low' },
  ];

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return '#FF0000';
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFD166';
      case 'low': return '#06D6A0';
      default: return '#999';
    }
  };

  return (
    <div className="map-visualization">
      <div className="map-header">
        <h3>Distribuição de Casos por Região</h3>
        <div className="map-update">
          <span className="update-indicator"></span>
          <span>Atualizado há 5 min</span>
        </div>
      </div>
      
      <div className="map-container">
        <div className="brazil-outline">
          {regions.map((region, index) => (
            <div 
              key={index}
              className="map-region"
              style={{ 
                backgroundColor: getRiskColor(region.risk) + '40',
                borderColor: getRiskColor(region.risk)
              }}
              title={`${region.name}: ${region.cases} casos`}
            >
              <div className="region-name">{region.name}</div>
              <div className="region-cases">{region.cases}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#06D6A0' }}></div>
          <span>Baixo risco</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFD166' }}></div>
          <span>Médio risco</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF6B6B' }}></div>
          <span>Alto risco</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF0000' }}></div>
          <span>Crítico</span>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
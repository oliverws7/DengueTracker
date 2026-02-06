import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DengueLineChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis 
          dataKey="date" 
          stroke="#666"
          tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
        />
        <YAxis stroke="#666" />
        <Tooltip 
          formatter={(value) => [`${value} casos`, 'Quantidade']}
          labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('pt-BR')}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="confirmed" 
          name="Confirmados"
          stroke="#FF6B6B" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="suspected" 
          name="Suspeitos"
          stroke="#FFD166" 
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default DengueLineChart;
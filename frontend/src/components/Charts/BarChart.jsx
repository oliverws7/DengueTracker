import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const DengueBarChart = ({ data }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#4A90E2'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="city" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip 
          formatter={(value) => [`${value} casos`, 'Quantidade']}
          labelStyle={{ color: '#333' }}
        />
        <Legend />
        <Bar dataKey="cases" name="Casos por Cidade">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DengueBarChart;
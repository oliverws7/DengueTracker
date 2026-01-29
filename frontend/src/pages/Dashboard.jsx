import { useEffect, useState } from 'react';
import { api } from '../services/api';


export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/public/stats') // Rota corrigida conforme reportRoutes.js
      .then(res => {
        setStats(res.data.data); // A API retorna os dados dentro de res.data.data
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar estatísticas:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Carregando estatísticas...</p>;
  if (!stats) return <p className="p-4 text-red-500">Erro ao carregar dados.</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Estatísticas Públicas 🦟</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total de Relatórios Confirmados */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-dengue-red">
          <p className="text-sm text-gray-500 uppercase font-semibold">Total de Casos</p>
          <p className="text-3xl font-bold text-gray-800">{stats.totalRelatorios}</p>
        </div>

        {/* Período de Monitoramento */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
          <p className="text-sm text-gray-500 uppercase font-semibold">Últimos Dias</p>
          <p className="text-3xl font-bold text-gray-800">{stats.periodo?.dias || 30}</p>
        </div>

        {/* Atualização mais recente */}
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-dengue-green">
          <p className="text-sm text-gray-500 uppercase font-semibold">Última Atualização</p>
          <p className="text-lg font-medium text-gray-700">
            {new Date(stats.atualizacao).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Listagem por Bairro (Top 10 mais afetados) */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Bairros Mais Afetados</h2>
        <div className="space-y-3">
          {stats.bairrosMaisAfetados && stats.bairrosMaisAfetados.map((bairro, index) => (
            <div key={index} className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-700">{bairro._id}</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                {bairro.count} focos
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
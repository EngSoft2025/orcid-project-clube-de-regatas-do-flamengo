
import React from 'react';
import ResearcherProfile from '../components/ResearcherProfile';
import { Researcher } from '../types';

// Props que esta página recebe do App
interface IndexProps {
  researcher: Researcher;
  loading: boolean;
}

const Index = ({ researcher, loading }: IndexProps) => {
  // Se estiver carregando, mostra mensagem de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 flex justify-center items-center">
        <p className="text-lg text-gray-600">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      {/* Passa os dados do pesquisador como props para o componente */}
      <ResearcherProfile 
        researcher={researcher}
        isEditable={true}
      />
    </div>
  );
};

export default Index;

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, User, Users, Building, BookOpen, Calendar } from 'lucide-react';
import { Researcher } from '../types';
import { useNavigate } from 'react-router-dom';

// Interface para definir quais props este componente recebe do App
interface SearchProps {
  researchers: Researcher[];
  loading: boolean;
}

const Search = ({ researchers, loading }: SearchProps) => {
  // Estado local para controlar a busca
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Filtra pesquisadores baseado na busca do usuário
  const filteredResearchers = researchers.filter(researcher => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      researcher.name.toLowerCase().includes(query) ||
      researcher.institution.toLowerCase().includes(query) ||
      researcher.researchAreas.some(area => area.toLowerCase().includes(query))
    );
  });

  // Função para navegar para o perfil de um pesquisador
  const viewProfile = (orcidId: string) => {
    navigate(`/researcher/${orcidId}`);
  };

  // Se está carregando, mostra tela de loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">Carregando pesquisadores...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Buscar Pesquisadores</h1>
      
      {/* Card com campo de busca */}
      <Card className="p-6 bg-white border-blue-100 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar por nome, instituição, área de pesquisa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200"
            />
          </div>
        </div>
      </Card>
      
      {/* Lista de pesquisadores filtrados */}
      <div className="space-y-6">
        {filteredResearchers.map(researcher => (
          <Card 
            key={researcher.orcidId} 
            className="p-6 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => viewProfile(researcher.orcidId)}
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-20 h-20">
                <User size={36} />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-blue-800 mb-2">{researcher.name}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-3">
                  <div className="flex items-center text-gray-600">
                    <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{researcher.institution}</span>
                  </div>
                  
                  {researcher.department && (
                    <div className="flex items-center text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{researcher.department}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{researcher.publications.length} publicações</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{researcher.projects.length} projetos</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {researcher.researchAreas.slice(0, 3).map((area, index) => (
                    <span 
                      key={index} 
                      className="bg-blue-50 text-blue-700 px-3 py-1 text-xs rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                  {researcher.researchAreas.length > 3 && (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 text-xs rounded-full">
                      +{researcher.researchAreas.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2 text-blue-600 border-blue-200"
                  >
                    Ver perfil completo
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Mensagem quando nenhum pesquisador é encontrado */}
        {filteredResearchers.length === 0 && (
          <div className="text-center py-10">
            <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum pesquisador encontrado</h3>
            <p className="text-gray-500">Tente utilizar termos de busca diferentes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;

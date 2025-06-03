
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, Search, Pencil } from 'lucide-react';
import { Publication } from '../types';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';

// Interface para definir quais props este componente recebe do App
interface PublicationsProps {
  publications: Publication[];
  loading: boolean;
}

const Publications = ({ publications, loading }: PublicationsProps) => {
  const navigate = useNavigate();
  // Estado local para controlar a busca
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtra publicações baseado na busca do usuário
  const filteredPublications = publications.filter(publication => {
    if (!searchQuery) return true;
    const titleMatch = publication.title.toLowerCase().includes(searchQuery.toLowerCase());
    const sourceMatch = publication.source.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = publication.type.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || sourceMatch || typeMatch;
  });

  // Função para editar uma publicação
  const handleEditPublication = (publicationId: string) => {
    navigate(`/edit-publication/${publicationId}`);
  };

  // Se está carregando, mostra tela de loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">Carregando publicações...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Cabeçalho da página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-4 md:mb-0">Minhas Publicações</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate('/new-publication')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Publicação
        </Button>
      </div>
      
      {/* Card principal com busca e lista */}
      <Card className="p-6 bg-white border-blue-100">
        {/* Campo de busca */}
        <div className="flex mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar publicações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200"
            />
          </div>
        </div>
        
        {/* Lista de publicações */}
        <div className="space-y-4">
          {filteredPublications.map((publication, index) => (
            <Card key={index} className="p-5 bg-white border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex flex-col">
                <h3 className="text-lg font-medium text-blue-800 mb-2">{publication.title}</h3>
                
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="mr-4">{publication.year}</span>
                  <FileText className="h-4 w-4 mr-1" />
                  <span>{publication.type}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{publication.source}</p>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {publication.authors.length} autor(es)
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={`/publication/${publication.id}`} className="text-sm text-blue-600 hover:underline">
                      Ver detalhes
                    </Link>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-gray-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={() => handleEditPublication(publication.id || '')}
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Mensagem quando não há publicações */}
        {filteredPublications.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhuma publicação encontrada.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Publications;

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, Search, Pencil, Trash2 } from 'lucide-react';
import { Publication, Project, Researcher } from '../types';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';

// Interface para definir quais props este componente recebe do App
interface PublicationsProps {
  publications: Publication[];
  loading: boolean;
  onDeletePublication: (publicationId: string) => void;
}

const Publications = ({ publications, loading, onDeletePublication }: PublicationsProps) => {
  const navigate = useNavigate();
  // Estado local para controlar a busca e paginação
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 publicações por página
  
  // Filtra publicações baseado na busca do usuário
  const filteredPublications = publications.filter(publication => {
    if (!searchQuery) return true;
    const titleMatch = publication.title.toLowerCase().includes(searchQuery.toLowerCase());
    const sourceMatch = publication.source.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = publication.type.toLowerCase().includes(searchQuery.toLowerCase());
    const authorsMatch = publication.authors.some(author => 
      author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || sourceMatch || typeMatch || authorsMatch;
  });

  // Calcula paginação
  const paginationData = useMemo(() => {
    const totalItems = filteredPublications.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredPublications.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      currentItems,
      startIndex,
      endIndex
    };
  }, [filteredPublications, currentPage, itemsPerPage]);

  // Reset página quando busca muda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Função para editar uma publicação
  const handleEditPublication = (publication: Publication) => {
    navigate(`/edit-publication/${publication.id}`, {
      state: { publication }
    });
  };

  // Função para navegar para detalhes da publicação
  const handleViewPublicationDetails = (publication: Publication) => {
    navigate(`/publication/${publication.id}`, {
      state: { 
        publication
      }
    });
  };

  // Função para excluir uma publicação
  const handleDeletePublication = (publication: Publication) => {
    if (window.confirm(`Tem certeza que deseja excluir a publicação "${publication.title}"?`)) {
      onDeletePublication(publication.id);
    }
  };

  // Função para mudar página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll para o topo da lista
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              placeholder="Buscar publicações por título, autor, fonte ou tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200"
            />
          </div>
        </div>

        {/* Contador de resultados */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredPublications.length} publicação(ões) encontrada(s) para "{searchQuery}"
          </div>
        )}
        
        {/* Lista de publicações */}
        <div className="space-y-4 min-h-[500px]">
          {paginationData.currentItems.map((publication, index) => (
            <Card key={index} className="p-5 bg-white border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex flex-col">
                <h3 className="text-lg font-medium text-blue-800 mb-2">{publication.title}</h3>
                
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="mr-4">{publication.year}</span>
                  <FileText className="h-4 w-4 mr-1" />
                  <span>{publication.type}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{publication.source}</p>
                
                {/* Lista de autores */}
                <p className="text-sm text-gray-500 mb-3">
                  <strong>Autores:</strong> {publication.authors.map(author => author.name).join(', ')}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {publication.authors.length} autor(es)
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewPublicationDetails(publication)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver detalhes
                    </button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-gray-500 hover:text-blue-600 flex items-center gap-1 px-2"
                      onClick={() => handleEditPublication(publication)}
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 px-2"
                      onClick={() => handleDeletePublication(publication)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
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
            <p className="text-gray-500">
              {searchQuery ? 'Nenhuma publicação encontrada para sua busca.' : 'Nenhuma publicação encontrada.'}
            </p>
          </div>
        )}

        {/* Componente de paginação */}
        <Pagination
          currentPage={currentPage}
          totalPages={paginationData.totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={paginationData.totalItems}
        />
      </Card>
    </div>
  );
};

export default Publications;
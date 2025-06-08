import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PublicationItem from './PublicationItem';
import { useNavigate } from 'react-router-dom';
import { Publication } from '../types';

// Interface para dados de paginação
interface PaginationData<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Props que este componente recebe
interface PublicationSectionProps {
  publications: Publication[];
  // NOVO: Adicionar todas as publicações para contagem correta
  allPublications?: Publication[];
  pagination?: PaginationData<Publication>;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  isMemoryPagination?: boolean;
}

const PublicationSection = ({ 
  publications, 
  allPublications,
  pagination,
  onPageChange,
  loading = false,
  isMemoryPagination = true
}: PublicationSectionProps) => {
  const navigate = useNavigate();
  
  // Estado para controlar quais seções estão expandidas
  const [expandedTypes, setExpandedTypes] = useState({
    'Journal Article': true,
    'journal-article': true,
    'Conference Paper': true,
    'conference-paper': true,
    'Book Chapter': true,
    'book-chapter': true,
    'Book': true,
    'Report': true,
    'Thesis': true,
  });

  // Estado para paginação dentro de cada tipo (página atual para cada tipo)
  const [typePages, setTypePages] = useState<Record<string, number>>({});
  const publicationsPerType = 5; // 5 publicações por tipo por página

  // Função para ir para próxima página de um tipo específico
  const goToNextPageForType = (type: string) => {
    setTypePages(prev => ({
      ...prev,
      [type]: (prev[type] || 1) + 1
    }));
  };

  // Função para ir para página anterior de um tipo específico
  const goToPrevPageForType = (type: string) => {
    setTypePages(prev => ({
      ...prev,
      [type]: Math.max((prev[type] || 1) - 1, 1)
    }));
  };

  // Função para obter página atual de um tipo
  const getCurrentPageForType = (type: string) => {
    return typePages[type] || 1;
  };

  // Função para obter publicações paginadas de um tipo
  const getPaginatedPublications = (publications: Publication[], type: string) => {
    const currentPage = getCurrentPageForType(type);
    const startIndex = (currentPage - 1) * publicationsPerType;
    const endIndex = startIndex + publicationsPerType;
    return publications.slice(startIndex, endIndex);
  };

  // Função para verificar se há próxima página para um tipo
  const hasNextPageForType = (publications: Publication[], type: string) => {
    const currentPage = getCurrentPageForType(type);
    return publications.length > currentPage * publicationsPerType;
  };

  // Função para verificar se há página anterior para um tipo
  const hasPrevPageForType = (type: string) => {
    return getCurrentPageForType(type) > 1;
  };

  // Função para obter número total de páginas para um tipo
  const getTotalPagesForType = (publications: Publication[]) => {
    return Math.ceil(publications.length / publicationsPerType);
  };

  // Função para expandir/contrair uma seção
  const toggleExpand = (type: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Normaliza o tipo de publicação para exibição
  const getDisplayType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'journal-article': 'Journal Article',
      'conference-paper': 'Conference Paper',
      'book-chapter': 'Book Chapter',
      'book': 'Book',
      'report': 'Report',
      'thesis': 'Thesis',
      'other': 'Other'
    };
    return typeMap[type] || type || 'Other';
  };

  // CORREÇÃO: Usar allPublications para contagem e paginação interna
  const publicationsForProcessing = allPublications || publications;

  // Agrupa TODAS as publicações por tipo (para contagem e paginação interna)
  const allGroupedPublications = publicationsForProcessing.reduce((acc: Record<string, Publication[]>, pub) => {
    const displayType = getDisplayType(pub.type);
    if (!acc[displayType]) {
      acc[displayType] = [];
    }
    acc[displayType].push(pub);
    return acc;
  }, {});

  // Remove tipos vazios (sem publicações) e ordena por número de publicações (decrescente)
  const nonEmptyTypes = Object.entries(allGroupedPublications)
    .filter(([type, pubs]) => pubs.length > 0)
    .sort(([, a], [, b]) => b.length - a.length);

  // Componente de paginação original (para APIs)
  const PaginationControls = () => {
    if (!pagination || !onPageChange || isMemoryPagination) return null;

    return (
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Página {pagination.currentPage} de {pagination.totalPages} 
          ({pagination.totalItems} publicações no total)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Próxima
          </Button>
        </div>
      </div>
    );
  };

  // Componente de paginação para cada tipo
  const TypePaginationControls = ({ type, allTypePubs }: { 
    type: string, 
    allTypePubs: Publication[] 
  }) => {
    // Se não é paginação em memória, não mostrar paginação interna
    if (!isMemoryPagination) return null;
    
    const currentPage = getCurrentPageForType(type);
    const totalPages = getTotalPagesForType(allTypePubs);
    const hasNext = hasNextPageForType(allTypePubs, type);
    const hasPrev = hasPrevPageForType(type);
    
    // Não mostrar paginação se há 5 ou menos publicações
    if (allTypePubs.length <= publicationsPerType) return null;

    return (
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Página {currentPage} de {totalPages} ({allTypePubs.length} publicações)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPrevPageForType(type)}
            disabled={!hasPrev || loading}
            className="text-xs px-3 py-1 h-7"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToNextPageForType(type)}
            disabled={!hasNext || loading}
            className="text-xs px-3 py-1 h-7"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Próximo
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 mb-6">
      {/* Cabeçalho da seção */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">
          Publicações Acadêmicas
          {loading && <span className="text-sm text-gray-500 ml-2">(Carregando...)</span>}
        </h2>
        <Button 
          variant="outline" 
          onClick={() => navigate('/publications')}
          className="text-sm"
          disabled={loading}
        >
          Ver todas
        </Button>
      </div>
      
      {/* Se não há publicações */}
      {publicationsForProcessing.length === 0 ? (
        <div className="text-center py-8">
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-gray-500">Carregando publicações...</span>
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma publicação encontrada.</p>
          )}
        </div>
      ) : (
        <>
          {/* Indicador de loading sobre o conteúdo */}
          {loading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Atualizando publicações...</span>
              </div>
            </div>
          )}

          {/* Para cada tipo de publicação */}
          {nonEmptyTypes.map(([type, allTypePubs]) => {
            // Usa todas as publicações deste tipo para paginação interna
            const totalCount = allTypePubs.length;
            const paginatedPubs = getPaginatedPublications(allTypePubs, type);
            const isExpanded = expandedTypes[type];
            
            return (
              <div key={type} className="mb-6">
                {/* Cabeçalho clicável para expandir/contrair com cor azul */}
                <div 
                  className="accordion-header cursor-pointer flex justify-between items-center p-3 hover:bg-blue-50 rounded border border-gray-200 transition-colors"
                  onClick={() => toggleExpand(type)}
                >
                  <h3 className="font-medium text-blue-600">
                    {type} ({totalCount})
                  </h3>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-blue-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                
                {/* Conteúdo da seção (só aparece se expandida) */}
                {isExpanded && (
                  <div className="mt-3 ml-2">
                    {/* Publicações paginadas */}
                    <div className="space-y-4">
                      {paginatedPubs.map((pub, index) => (
                        <div 
                          key={pub.id || `${type}-${index}`} 
                          className={`transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}
                        >
                          <PublicationItem publication={pub} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Controles de paginação específicos para este tipo */}
                    <TypePaginationControls 
                      type={type} 
                      allTypePubs={allTypePubs} 
                    />
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Controles de paginação original (para APIs) */}
          <PaginationControls />
        </>
      )}
    </Card>
  );
};

export default PublicationSection;
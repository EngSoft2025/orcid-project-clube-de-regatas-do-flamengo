import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Project, Publication } from '../types';

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
interface ProjectSectionProps {
  projects: Project[];
  publications: Publication[];
  pagination?: PaginationData<Project>;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  isMemoryPagination?: boolean;
}

const ProjectSection = ({ 
  projects, 
  publications,
  pagination,
  onPageChange,
  loading = false,
  isMemoryPagination = true
}: ProjectSectionProps) => {
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Count publications by project
  const getProjectPublications = (projectName: string) => {
    return publications.filter(pub => pub.project === projectName);
  };

  // Formata o período do projeto
  const formatProjectPeriod = (startYear: number | string, endYear: number | string | null) => {
    const start = startYear?.toString() || 'N/A';
    const end = endYear === null || endYear === 'Em andamento' ? 'Atual' : endYear?.toString() || 'Atual';
    return `${start} - ${end}`;
  };

  // Componente de paginação
  const PaginationControls = () => {
    if (!pagination || !onPageChange || isMemoryPagination) return null;

    return (
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Página {pagination.currentPage} de {pagination.totalPages} 
          ({pagination.totalItems} projetos no total)
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

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">
          Projetos de Pesquisa
          {loading && <span className="text-sm text-gray-500 ml-2">(Carregando...)</span>}
        </h2>
        <Button 
          variant="outline" 
          onClick={() => navigate('/projects')}
          className="text-sm"
          disabled={loading}
        >
          Ver todos
        </Button>
      </div>
      
      {projects.length === 0 ? (
        <div className="text-center py-8">
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-gray-500">Carregando projetos...</span>
            </div>
          ) : (
            <p className="text-gray-500">Nenhum projeto encontrado.</p>
          )}
        </div>
      ) : (
        <>
          {/* Indicador de loading sobre o conteúdo */}
          {loading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Atualizando projetos...</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {projects.map((project) => {
              const projectPubs = getProjectPublications(project.name || project.title);
              
              return (
                <div 
                  key={project.id} 
                  className={`border border-gray-200 rounded-md bg-white transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}
                >
                  <div 
                    className="accordion-header cursor-pointer p-4"
                    onClick={() => toggleExpand(project.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 mb-1">
                          {project.name || project.title}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {formatProjectPeriod(project.startYear, project.endYear)}
                          {project.fundingAgency && (
                            <span className="ml-2">• {project.fundingAgency}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center ml-4">
                        <span className="text-sm text-gray-500 mr-2">
                          {projectPubs.length} publicações
                        </span>
                        {expandedProjects[project.id] ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedProjects[project.id] && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <div className="pt-4">
                        {/* Descrição do projeto */}
                        {project.description && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700">{project.description}</p>
                          </div>
                        )}
                        
                        {/* Detalhes do financiamento */}
                        {(project.funding || project.fundingAgency) && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-md">
                            <h4 className="text-sm font-medium text-gray-800 mb-2">Financiamento</h4>
                            {project.fundingAgency && (
                              <p className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">Agência:</span> {project.fundingAgency}
                              </p>
                            )}
                            {project.funding && (
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Valor:</span> {project.funding}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Papel do pesquisador */}
                        {project.role && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Papel:</span> {project.role}
                            </p>
                          </div>
                        )}
                        
                        {/* Publicações associadas */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-800 mb-3">Publicações associadas:</h4>
                          {projectPubs.length > 0 ? (
                            <div className="space-y-2">
                              {projectPubs.map((pub, index) => (
                                <div key={index} className="pl-4 border-l-2 border-blue-200">
                                  <p className="text-sm">
                                    <span className="text-blue-600 font-medium">{pub.title}</span>
                                    <span className="text-gray-500 ml-2">({pub.year})</span>
                                  </p>
                                  {pub.source && (
                                    <p className="text-xs text-gray-500 mt-1">{pub.source}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              Nenhuma publicação associada a este projeto.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Controles de paginação */}
          <PaginationControls />
        </>
      )}
    </Card>
  );
};

export default ProjectSection;
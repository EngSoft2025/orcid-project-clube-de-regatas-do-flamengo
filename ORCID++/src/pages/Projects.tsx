import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, Search, Pencil } from 'lucide-react';
import { Project, Publication, Researcher } from '../types';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import Pagination from '../components/Pagination';

// Interface para definir quais props este componente recebe do App
interface ProjectsProps {
  projects: Project[];
  publications: Publication[];
  researcher?: Researcher;
  loading: boolean;
}

const Projects = ({ projects, publications, researcher, loading }: ProjectsProps) => {
  const navigate = useNavigate();
  // Estado local para controlar a busca e paginação
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // 6 projetos por página (3x2 grid)
  
  // Filtra projetos baseado na busca do usuário
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const nameMatch = project.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const titleMatch = project.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || titleMatch || descMatch;
  });

  // Calcula paginação
  const paginationData = useMemo(() => {
    const totalItems = filteredProjects.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredProjects.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      currentItems,
      startIndex,
      endIndex
    };
  }, [filteredProjects, currentPage, itemsPerPage]);

  // Reset página quando busca muda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Função para calcular progresso de um projeto
  const calculateProgress = (project: Project) => {
    const current = new Date().getFullYear();
    const start = project.startYear;
    const end = typeof project.endYear === 'number' ? project.endYear : parseInt(project.endYear);
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    const total = end - start;
    const elapsed = current - start;
    
    return Math.round((elapsed / total) * 100);
  };

  // Função para definir cor do status baseado no progresso
  const getStatusColor = (project: Project) => {
    const progress = calculateProgress(project);
    if (progress === 100) return 'text-gray-500';
    if (progress >= 75) return 'text-orange-500';
    return 'text-green-500';
  };
  
  // Função para editar um projeto
  const handleEditProject = (project: Project) => {
    navigate(`/edit-project/${project.id}`, {
      state: { project }
    });
  };

  // Função para navegar para detalhes do projeto
  const handleViewProjectDetails = (project: Project) => {
    navigate(`/project/${project.id}`, {
      state: { 
        project, 
        publications,
        researcher 
      }
    });
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
        <p className="text-lg text-gray-600">Carregando projetos...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Cabeçalho da página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-4 md:mb-0">Meus Projetos de Pesquisa</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate('/new-project')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>
      
      {/* Card principal com busca e grid */}
      <Card className="p-6 bg-white border-blue-100">
        {/* Campo de busca */}
        <div className="flex mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200"
            />
          </div>
        </div>

        {/* Contador de resultados */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredProjects.length} projeto(s) encontrado(s) para "{searchQuery}"
          </div>
        )}
        
        {/* Grid de projetos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
          {paginationData.currentItems.map((project) => (
            <Card key={project.id} className="p-5 bg-white border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                  {project.name || project.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {project.startYear} - {project.endYear || 'Atual'}
                  </span>
                </div>
                
                {project.funding || project.fundingAgency ? (
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Financiamento:</strong> {project.funding || project.fundingAgency}
                  </p>
                ) : null}
                
                <div className="mt-auto">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span>Progresso</span>
                    <span className={getStatusColor(project)}>
                      {calculateProgress(project)}%
                    </span>
                  </div>
                  <Progress value={calculateProgress(project)} className="h-2 mb-4" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        {(project.publications?.length || 0)} publicações
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleViewProjectDetails(project)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Ver detalhes
                      </button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-gray-500 hover:text-blue-600 flex items-center gap-1"
                        onClick={() => handleEditProject(project)}
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Mensagem quando não há projetos */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">
              {searchQuery ? 'Nenhum projeto encontrado para sua busca.' : 'Nenhum projeto encontrado.'}
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

export default Projects;
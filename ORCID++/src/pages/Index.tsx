import React, { useState, useMemo } from 'react';
import ResearcherProfile from '../components/ResearcherProfile';
import { Researcher, Publication, Project } from '../types';

// Props que esta página recebe do App
interface IndexProps {
  researcher: Researcher;
  loading: boolean;
}

const ITEMS_PER_PAGE = 10;

const Index = ({ researcher, loading }: IndexProps) => {
  // Estados para controle de paginação
  const [publicationsPage, setPublicationsPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);

  // Função para paginar publicações em memória
  const getPaginatedPublications = useMemo(() => {
    const startIndex = (publicationsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = researcher.publications.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      currentPage: publicationsPage,
      totalPages: Math.ceil(researcher.publications.length / ITEMS_PER_PAGE),
      totalItems: researcher.publications.length,
      hasNextPage: endIndex < researcher.publications.length,
      hasPrevPage: publicationsPage > 1,
    };
  }, [researcher.publications, publicationsPage]);

  // Função para paginar projetos em memória
  const getPaginatedProjects = useMemo(() => {
    const startIndex = (projectsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = researcher.projects.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      currentPage: projectsPage,
      totalPages: Math.ceil(researcher.projects.length / ITEMS_PER_PAGE),
      totalItems: researcher.projects.length,
      hasNextPage: endIndex < researcher.projects.length,
      hasPrevPage: projectsPage > 1,
    };
  }, [researcher.projects, projectsPage]);

  // Handlers para mudança de página
  const handlePublicationsPageChange = (newPage: number) => {
    setPublicationsPage(newPage);
  };

  const handleProjectsPageChange = (newPage: number) => {
    setProjectsPage(newPage);
  };

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
        // Props para paginação de publicações
        publicationsPagination={getPaginatedPublications}
        onPublicationsPageChange={handlePublicationsPageChange}
        // Props para paginação de projetos
        projectsPagination={getPaginatedProjects}
        onProjectsPageChange={handleProjectsPageChange}
        // Indica que a paginação é em memória
        isMemoryPagination={true}
      />
    </div>
  );
};

export default Index;
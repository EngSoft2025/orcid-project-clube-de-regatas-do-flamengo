import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import PublicationSection from './PublicationSection';
import ProjectSection from './ProjectSection';
import PublicationChart from './PublicationChart';
import ProjectPublicationChart from './ProjectPublicationChart';
import { Researcher, Publication, Project } from '../types';

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
interface ResearcherProfileProps {
  researcher: Researcher;
  isEditable?: boolean;
  // Props para paginação de publicações
  publicationsPagination: PaginationData<Publication>;
  onPublicationsPageChange: (page: number) => void;
  // Props para paginação de projetos
  projectsPagination: PaginationData<Project>;
  onProjectsPageChange: (page: number) => void;
  // Indica se a paginação é em memória ou via API
  isMemoryPagination: boolean;
  // Estados de loading para API
  publicationsLoading?: boolean;
  projectsLoading?: boolean;
  // NOVO: Props explícitas para dados completos (para garantir consistência)
  allPublications?: Publication[];
  allProjects?: Project[];
}

const ResearcherProfile = ({ 
  researcher, 
  isEditable = false,
  publicationsPagination,
  onPublicationsPageChange,
  projectsPagination,
  onProjectsPageChange,
  isMemoryPagination,
  publicationsLoading = false,
  projectsLoading = false,
  allPublications,
  allProjects
}: ResearcherProfileProps) => {
  // Estado local apenas para controlar qual gráfico está ativo
  const [activeChartTab, setActiveChartTab] = useState("publications");

  // CORREÇÃO: Usar dados explícitos ou fallback para researcher
  const effectiveAllPublications = allPublications || researcher.publications || [];
  const effectiveAllProjects = allProjects || researcher.projects || [];

  // Debug: Log para verificar dados
  console.log('ResearcherProfile render:', {
    researcherPublications: researcher.publications?.length || 0,
    researcherProjects: researcher.projects?.length || 0,
    allPublications: effectiveAllPublications.length,
    allProjects: effectiveAllProjects.length,
    paginatedPublications: publicationsPagination.items.length,
    paginatedProjects: projectsPagination.items.length
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Cabeçalho do perfil - passa dados do pesquisador */}
      <ProfileHeader researcher={researcher} />

      {/* Layout em grid para organizar o conteúdo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        
        {/* Coluna principal (2/3 da largura) */}
        <div className="md:col-span-2">
          {/* Seção de publicações - usa dados efetivos para contagem */}
          <PublicationSection 
            publications={publicationsPagination.items}
            allPublications={effectiveAllPublications} // CORREÇÃO: Usar dados efetivos
            pagination={publicationsPagination}
            onPageChange={onPublicationsPageChange}
            loading={publicationsLoading}
            isMemoryPagination={isMemoryPagination}
          />
          
          {/* Seção de projetos - usa dados efetivos */}
          <ProjectSection 
            projects={projectsPagination.items}
            publications={effectiveAllPublications} // CORREÇÃO: Para gráficos, usa dados efetivos
            pagination={projectsPagination}
            onPageChange={onProjectsPageChange}
            loading={projectsLoading}
            isMemoryPagination={isMemoryPagination}
          />
        </div>
        
        {/* Barra lateral (1/3 da largura) */}
        <div className="md:col-span-1">
          {/* Card com gráficos */}
          <Card className="p-4 mb-6">
            <h3 className="section-title mb-4">Evolução de Publicações</h3>
            
            {/* Tabs para alternar entre diferentes gráficos */}
            <Tabs value={activeChartTab} onValueChange={setActiveChartTab}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="publications" className="flex-1">Por Ano</TabsTrigger>
                <TabsTrigger value="projects" className="flex-1">Por Projeto</TabsTrigger>
              </TabsList>
              
              {/* Conteúdo de cada tab */}
              <TabsContent value="publications">
                {/* CORREÇÃO: Sempre usar dados completos para gráficos */}
                <PublicationChart 
                  publications={effectiveAllPublications} 
                />
              </TabsContent>
              
              <TabsContent value="projects">
                {/* CORREÇÃO: Sempre usar dados completos para gráficos */}
                <ProjectPublicationChart 
                  publications={effectiveAllPublications}
                  projects={effectiveAllProjects}
                />
              </TabsContent>
            </Tabs>
          </Card>
          
          {/* Card com links acadêmicos */}
          <Card className="p-4">
            <h3 className="section-title mb-4">Links Acadêmicos</h3>
            <ul className="space-y-2">
              {/* Link para página institucional */}
              {researcher.institutionalPage && (
                <li className="flex items-center text-blue-600 hover:text-blue-800">
                  <Link className="w-4 h-4 mr-2" />
                  <a href={researcher.institutionalPage} target="_blank" rel="noopener noreferrer">
                    Página Institucional
                  </a>
                </li>
              )}
              
              {/* Link para ORCID */}
              {researcher.orcidId && (
                <li className="flex items-center text-blue-600 hover:text-blue-800">
                  <Link className="w-4 h-4 mr-2" />
                  <a href={`https://orcid.org/${researcher.orcidId}`} target="_blank" rel="noopener noreferrer">
                    Perfil ORCID
                  </a>
                </li>
              )}
              
              {/* Links externos do pesquisador */}
              {researcher.externalLinks.map((link, index) => (
                <li key={index} className="flex items-center text-blue-600 hover:text-blue-800">
                  <Link className="w-4 h-4 mr-2" />
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResearcherProfile;
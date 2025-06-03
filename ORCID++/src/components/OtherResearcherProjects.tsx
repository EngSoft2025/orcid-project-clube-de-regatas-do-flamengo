
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, FileText, Search } from 'lucide-react';
import { Project, Publication } from '../types';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface OtherResearcherProjectsProps {
  projects: Project[];
  publications: Publication[];
}

const OtherResearcherProjects = ({ projects, publications }: OtherResearcherProjectsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const nameMatch = project.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const titleMatch = project.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || titleMatch || descMatch;
  });

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

  const getStatusColor = (project: Project) => {
    const progress = calculateProgress(project);
    if (progress === 100) return 'text-gray-500';
    if (progress >= 75) return 'text-orange-500';
    return 'text-green-500';
  };
  
  return (
    <div className="max-w-6xl">
      <Card className="p-6 bg-white border-blue-100">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
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
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">Nenhum projeto encontrado.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OtherResearcherProjects;

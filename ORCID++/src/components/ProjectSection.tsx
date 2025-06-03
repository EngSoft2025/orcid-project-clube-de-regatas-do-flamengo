
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProjectSection = ({ projects, publications }) => {
  const navigate = useNavigate();
  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Count publications by project
  const getProjectPublications = (projectName) => {
    return publications.filter(pub => pub.project === projectName);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">Projetos de Pesquisa</h2>
        <Button 
          variant="outline" 
          onClick={() => navigate('/projects')}
          className="text-sm"
        >
          Ver todos
        </Button>
      </div>
      
      {projects.length === 0 ? (
        <p className="text-gray-500">Nenhum projeto encontrado.</p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const projectPubs = getProjectPublications(project.name);
            
            return (
              <div key={project.id} className="border border-gray-200 rounded-md bg-white">
                <div 
                  className="accordion-header"
                  onClick={() => toggleExpand(project.id)}
                >
                  <h3 className="font-medium">{project.name}</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                      {projectPubs.length} publicações
                    </span>
                    {expandedProjects[project.id] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
                
                {expandedProjects[project.id] && (
                  <div className="p-4 border-t border-gray-200">
                    <p className="text-sm text-gray-700 mb-4">{project.description}</p>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Período: {project.startYear} - {project.endYear || "Atual"}</h4>
                      
                      {project.funding && (
                        <p className="text-sm text-gray-700 mb-3">
                          <span className="font-medium">Financiamento:</span> {project.funding}
                        </p>
                      )}
                      
                      <h4 className="text-sm font-medium mb-2">Publicações associadas:</h4>
                      {projectPubs.length > 0 ? (
                        <ul className="list-disc list-inside text-sm space-y-2 ml-2">
                          {projectPubs.map((pub, index) => (
                            <li key={index}>
                              <span className="text-blue-600">{pub.title}</span> ({pub.year})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhuma publicação associada a este projeto.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ProjectSection;

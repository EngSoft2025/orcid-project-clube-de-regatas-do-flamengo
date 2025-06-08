import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText,
  Building,
  Clock
} from 'lucide-react';
import { Project, Publication, Researcher } from '../types';

const OtherProjectDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  // Recebe os dados via location.state
  const { 
    project, 
    publications = [], 
    researcher 
  } = location.state || {};

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
    if (progress === 100) return 'bg-gray-100 text-gray-800';
    if (progress >= 75) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  // Função para obter texto do status
  const getStatusText = (project: Project) => {
    const progress = calculateProgress(project);
    if (progress === 100) return 'Concluído';
    if (progress >= 75) return 'Em finalização';
    return 'Em andamento';
  };

  // Filtrar publicações relacionadas ao projeto
  const relatedPublications = publications.filter((pub: Publication) => 
    project?.publications?.some((projPub: any) => projPub.id === pub.id) ||
    pub.title.toLowerCase().includes(project?.name?.toLowerCase() || '') ||
    pub.title.toLowerCase().includes(project?.title?.toLowerCase() || '')
  );

  // Se o projeto não foi encontrado
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Projeto não encontrado</h2>
            <p className="mb-6">Não foi possível encontrar os dados do projeto.</p>
            <Button onClick={() => navigate('/')}>Voltar para o Perfil</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Cabeçalho com navegação */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>
          {researcher && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/researcher/${researcher.orcidId || researcher.id}`)}
              className="flex items-center gap-2"
            >
              <Users size={16} /> Ver Perfil do Pesquisador
            </Button>
          )}
        </div>

        {/* Card principal do projeto */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl text-blue-800 mb-2">
                  {project.name || project.title}
                </CardTitle>
                <Badge className={getStatusColor(project)}>
                  {getStatusText(project)}
                </Badge>
                {researcher && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>Pesquisador: {researcher.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Descrição */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
              <p className="text-gray-700 leading-relaxed">{project.description}</p>
            </div>

            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Período */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Período</h4>
                  <p className="text-gray-600">
                    {project.startYear} - {project.endYear || 'Em andamento'}
                  </p>
                </div>
              </div>

              {/* Papel/Função */}
              {project.role && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900">Função</h4>
                    <p className="text-gray-600">{project.role}</p>
                  </div>
                </div>
              )}

              {/* Financiamento */}
              {(project.funding || project.fundingAgency) && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900">Financiamento</h4>
                    {project.funding && (
                      <p className="text-gray-600">{project.funding}</p>
                    )}
                    {project.fundingAgency && (
                      <p className="text-gray-600 text-sm">{project.fundingAgency}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Progresso */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">Progresso do Projeto</h4>
                <span className="text-sm text-gray-600">
                  {calculateProgress(project)}%
                </span>
              </div>
              <Progress value={calculateProgress(project)} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Publicações relacionadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Publicações Relacionadas
              <Badge variant="secondary" className="ml-2">
                {relatedPublications.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relatedPublications.length > 0 ? (
              <div className="space-y-4">
                {relatedPublications.map((publication: Publication, index: number) => (
                  <Card key={index} className="p-4 bg-gray-50 border-gray-200">
                    <div className="flex flex-col">
                      <h4 className="font-medium text-blue-800 mb-2">
                        <button
                          onClick={() => navigate(`/other-publication/${publication.id}`, {
                            state: { 
                              publication, 
                              projects: [project],
                              researcher 
                            }
                          })}
                          className="hover:underline text-left"
                        >
                          {publication.title}
                        </button>
                      </h4>
                      
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="mr-4">{publication.year}</span>
                        <FileText className="h-4 w-4 mr-1" />
                        <span>{publication.type}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{publication.source}</p>
                      
                      <p className="text-sm text-gray-500">
                        <strong>Autores:</strong> {publication.authors.map(author => author.name).join(', ')}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma publicação relacionada encontrada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtherProjectDetailPage;
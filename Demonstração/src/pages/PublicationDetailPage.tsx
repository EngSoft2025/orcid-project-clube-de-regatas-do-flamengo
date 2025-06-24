import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Users, 
  Pencil,
  ExternalLink,
  BookOpen,
  Quote,
  Hash,
  Folder
} from 'lucide-react';
import { Publication, Project, Researcher } from '../types';

const PublicationDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { publicationId } = useParams();

  // Recebe os dados via location.state
  const { 
    publication, 
    projects = [], 
    researcher 
  } = location.state || {};

  // Filtrar projetos relacionados à publicação
  const relatedProjects = projects.filter((project: Project) => 
    project.publications?.some((pub: any) => pub.id === publication?.id) ||
    project.name?.toLowerCase().includes(publication?.title.toLowerCase() || '') ||
    project.title?.toLowerCase().includes(publication?.title.toLowerCase() || '')
  );

  // Função para editar a publicação
  const handleEditPublication = () => {
    navigate(`/edit-publication/${publicationId}`, {
      state: { publication }
    });
  };

  // Função para formatar tipo de publicação
  const formatPublicationType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'journal-article': 'Artigo de Periódico',
      'conference-paper': 'Artigo de Conferência',
      'book': 'Livro',
      'book-chapter': 'Capítulo de Livro',
      'thesis': 'Tese',
      'dissertation': 'Dissertação',
      'working-paper': 'Working Paper',
      'report': 'Relatório',
      'other': 'Outro'
    };
    return typeMap[type] || type;
  };

  // Função para obter cor do badge baseado no tipo
  const getTypeColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'journal-article': 'bg-blue-100 text-blue-800',
      'conference-paper': 'bg-green-100 text-green-800',
      'book': 'bg-purple-100 text-purple-800',
      'book-chapter': 'bg-indigo-100 text-indigo-800',
      'thesis': 'bg-red-100 text-red-800',
      'dissertation': 'bg-orange-100 text-orange-800',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  // Se a publicação não foi encontrada
  if (!publication) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Publicação não encontrada</h2>
            <p className="mb-6">Não foi possível encontrar os dados da publicação.</p>
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
          <Button 
            onClick={handleEditPublication}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Pencil size={16} /> Editar Publicação
          </Button>
        </div>

        {/* Card principal da publicação */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl text-blue-800 mb-3 leading-tight">
                  {publication.title}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className={getTypeColor(publication.type)}>
                    {formatPublicationType(publication.type)}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {publication.year}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Autores */}
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">Autores</h4>
                <div className="space-y-1">
                  {publication.authors.map((author: any, index: number) => (
                    <div key={index} className="text-gray-700">
                      {author.orcidId ? (
                        <button
                          onClick={() => navigate(`/researcher/${author.orcidId}`)}
                          className="text-blue-600 hover:underline"
                        >
                          {author.name}
                        </button>
                      ) : (
                        author.name
                      )}
                      {index < publication.authors.length - 1 && ', '}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fonte/Periódico */}
            {publication.source && (
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Fonte</h4>
                  <p className="text-gray-700">{publication.source}</p>
                </div>
              </div>
            )}

            {/* Resumo */}
            {publication.abstract && (
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
                  <p className="text-gray-700 leading-relaxed">{publication.abstract}</p>
                </div>
              </div>
            )}

            {/* Identificadores */}
            {publication.identifier && publication.identifier.value && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Identificador</h4>
                  <p className="text-gray-700">
                    <strong>{publication.identifier.type.toUpperCase()}:</strong> {publication.identifier.value}
                  </p>
                </div>
              </div>
            )}

            {/* Links externos */}
            {publication.links && publication.links.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Links</h4>
                <div className="space-y-2">
                  {publication.links.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {link.name || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projetos relacionados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Projetos Relacionados
              <Badge variant="secondary" className="ml-2">
                {relatedProjects.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relatedProjects.length > 0 ? (
              <div className="space-y-4">
                {relatedProjects.map((project: Project, index: number) => (
                  <Card key={index} className="p-4 bg-gray-50 border-gray-200">
                    <div className="flex flex-col">
                      <h4 className="font-medium text-blue-800 mb-2">
                        <button
                          onClick={() => navigate(`/project/${project.id}`, {
                            state: { 
                              project, 
                              publications: [publication],
                              researcher 
                            }
                          })}
                          className="hover:underline text-left"
                        >
                          {project.name || project.title}
                        </button>
                      </h4>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {project.description}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          {project.startYear} - {project.endYear || 'Atual'}
                        </span>
                        {project.funding && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{project.funding}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum projeto relacionado encontrado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicationDetailPage;
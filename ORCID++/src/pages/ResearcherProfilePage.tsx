import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Researcher, Project, Publication } from '../types';
import ResearcherProfile from '../components/ResearcherProfile';
import OtherResearcherPublications from '../components/OtherResearcherPublications';
import OtherResearcherProjects from '../components/OtherResearcherProjects';
import { toast } from '@/components/ui/use-toast';

// Props que esta página recebe do App
interface ResearcherProfilePageProps {
  getResearcherById: (id: string) => Researcher | null;
  loadResearcherData: (id: string, callback: (researcher: Researcher | null) => void) => void;
  loading: boolean;
}

const ITEMS_PER_PAGE = 10;

const ResearcherProfilePage = ({ getResearcherById, loadResearcherData, loading }: ResearcherProfilePageProps) => {
  // Pega o ID da URL
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados locais desta página
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isForeignProfile, setIsForeignProfile] = useState(false);
  const [foreignStatus, setForeignStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasRun = useRef(false);

  // Estados para paginação (apenas para perfis internos)
  const [publicationsPage, setPublicationsPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);

  // Estados para carregamento completo de dados ORCID
  const [allPublications, setAllPublications] = useState<Publication[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // API Base URL para perfis externos (ORCID)
  const API_BASE_URL = 'http://localhost:3000';

  // Determinar se é um perfil externo (ORCID) baseado no formato do ID
  const isORCIDFormat = (orcidId: string): boolean => {
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    return orcidRegex.test(orcidId);
  };

  // Função para extrair dados básicos do perfil ORCID
  const getDisplayName = (profile: any): string => {
    const person = profile.person;
    if (person?.name) {
      const given = person.name['given-names']?.value || '';
      const family = person.name['family-name']?.value || '';
      return `${given} ${family}`.trim();
    }
    return 'Pesquisador Desconhecido';
  };

  // Função para buscar TODAS as publicações de uma vez
  const fetchAllPublications = async (orcidId: string) => {
    try {
      setPublicationsLoading(true);
      
      // Primeiro, buscar o número total de trabalhos
      const worksResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}/works`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!worksResponse.ok) {
        throw new Error('Falha ao buscar publicações');
      }

      const worksData = await worksResponse.json();
      
      // Buscar informações detalhadas de cada work
      const workPromises = worksData.group?.map(async (group: any) => {
        const putCode = group['work-summary'][0]['put-code'];
        try {
          const workResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}/work/${putCode}`, {
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (workResponse.ok) {
            return await workResponse.json();
          }
        } catch (error) {
          console.error(`Falha ao buscar work ${putCode}:`, error);
        }
        return null;
      }) || [];

      const workDetails = await Promise.all(workPromises);
      
      // Mapear works do ORCID para interface Publication
      const publications = workDetails
        .filter(work => work !== null)
        .map((work: any) => {
          const title = work.title?.title?.value || 'Sem título';
          const year = work['publication-date']?.year?.value || new Date().getFullYear();
          const type = work.type || 'journal-article';
          const journal = work['journal-title']?.value || '';
          
          // Extrair autores
          const authors = [];
          if (work.contributors?.contributor) {
            work.contributors.contributor.forEach((contributor: any) => {
              if (contributor['credit-name']?.value) {
                authors.push({
                  name: contributor['credit-name'].value,
                  orcidId: contributor['contributor-orcid']?.path || '',
                });
              }
            });
          }

          // Extrair identificadores externos
          let identifier = { type: 'other', value: '' };
          if (work['external-ids']?.['external-id']?.length > 0) {
            const extId = work['external-ids']['external-id'][0];
            identifier = {
              type: extId['external-id-type'] || 'other',
              value: extId['external-id-value'] || '',
            };
          }

          return {
            id: work['put-code']?.toString(),
            title,
            authors,
            year,
            type,
            source: journal,
            identifier,
            abstract: work['short-description'] || '',
            links: [],
          };
        });

      setAllPublications(publications);

    } catch (error) {
      console.error('Erro ao buscar publicações:', error);
      toast({
        title: "Erro ao carregar publicações",
        description: "Não foi possível carregar as publicações do pesquisador.",
        variant: "destructive"
      });
    } finally {
      setPublicationsLoading(false);
    }
  };

  // Função para buscar TODOS os projetos de uma vez
  const fetchAllProjects = async (orcidId: string) => {
    try {
      setProjectsLoading(true);
      
      const fundingResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}/fundings`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!fundingResponse.ok) {
        throw new Error('Falha ao buscar projetos');
      }

      const fundingData = await fundingResponse.json();
      
      // Buscar informações detalhadas de cada funding
      const fundingPromises = fundingData.group?.map(async (group: any) => {
        const putCode = group['funding-summary'][0]['put-code'];
        try {
          const fundingDetailResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}/funding/${putCode}`, {
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (fundingDetailResponse.ok) {
            return await fundingDetailResponse.json();
          }
        } catch (error) {
          console.error(`Falha ao buscar funding ${putCode}:`, error);
        }
        return null;
      }) || [];

      const fundingDetails = await Promise.all(fundingPromises);
      
      // Mapear funding do ORCID para interface Project
      const projects = fundingDetails
        .filter(funding => funding !== null)
        .map((funding: any) => {
          const title = funding.title?.title?.value || 'Projeto sem título';
          const description = funding['short-description'] || '';
          
          // Extrair datas de início e fim
          const startDate = funding['start-date'];
          const endDate = funding['end-date'];
          const startYear = startDate?.year?.value ? parseInt(startDate.year.value) : new Date().getFullYear();
          const endYear = endDate?.year?.value ? parseInt(endDate.year.value) : 'Em andamento';
          
          // Extrair organização de financiamento
          const organization = funding.organization;
          const fundingAgency = organization?.name || '';
          const fundingCity = organization?.address?.city || '';
          const fundingCountry = organization?.address?.country || '';
          
          // Extrair tipo e valor do financiamento
          const fundingType = funding.type || '';
          const amount = funding.amount;
          const fundingAmount = amount ? `${amount.value} ${amount['currency-code']}` : '';
          
          // Extrair identificadores externos para referência do financiamento
          let fundingId = '';
          if (funding['external-ids']?.['external-id']?.length > 0) {
            const extId = funding['external-ids']['external-id'][0];
            fundingId = extId['external-id-value'] || '';
          }

          return {
            id: funding['put-code']?.toString() || fundingId,
            name: title,
            title: title,
            description: description || `Financiamento ${fundingType} de ${fundingAgency}`,
            startYear,
            endYear,
            funding: fundingAmount,
            fundingAgency: `${fundingAgency}${fundingCity ? `, ${fundingCity}` : ''}${fundingCountry ? `, ${fundingCountry}` : ''}`,
            role: 'Pesquisador',
            publications: [],
          };
        });

      setAllProjects(projects);

    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      toast({
        title: "Erro ao carregar projetos",
        description: "Não foi possível carregar os projetos do pesquisador.",
        variant: "destructive"
      });
    } finally {
      setProjectsLoading(false);
    }
  };

  // Função para buscar dados básicos do ORCID primeiro
  const fetchORCIDBasicData = async (orcidId: string) => {
    try {
      setForeignStatus('loading');
      
      // Validar formato do ORCID ID
      if (!isORCIDFormat(orcidId)) {
        throw new Error('Formato de ORCID ID inválido');
      }

      // Buscar apenas o perfil básico do pesquisador
      const profileResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(`Falha ao buscar perfil ORCID: ${errorData.error || 'Erro desconhecido'}`);
      }

      const profileData = await profileResponse.json();

      // Mapear perfil ORCID para interface Researcher (sem publications e projects por enquanto)
      const researcherData: Researcher = {
        name: getDisplayName(profileData),
        orcidId: orcidId,
        institution: getAffiliation(profileData) || '',
        department: getDepartment(profileData) || '',
        role: getRole(profileData) || '',
        bio: getBio(profileData) || '',
        email: getEmail(profileData) || '',
        researchAreas: getResearchAreas(profileData) || [],
        education: getEducation(profileData) || [],
        awards: getAwards(profileData) || [],
        institutionalPage: '',
        externalLinks: getExternalLinks(profileData) || [],
        publications: [], // Será preenchido depois
        projects: [], // Será preenchido depois
      };

      setResearcher(researcherData);
      setForeignStatus('success');

      // Carregar publicações e projetos em paralelo, mas de forma assíncrona
      Promise.all([
        fetchAllPublications(orcidId),
        fetchAllProjects(orcidId)
      ]);

    } catch (error) {
      console.error('Erro ao buscar dados do pesquisador:', error);
      setForeignStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  // Função para tentar novamente (para perfis ORCID)
  const handleRetry = () => {
    if (isForeignProfile && id) {
      hasRun.current = false;
      setErrorMessage('');
      setAllPublications([]);
      setAllProjects([]);
      fetchORCIDBasicData(id);
    }
  };

  // Efeito que roda quando o componente carrega ou o ID muda
  useEffect(() => {
    if (!id) return;

    // Verificar se é um perfil externo (ORCID) ou interno
    if (isORCIDFormat(id)) {
      // É um perfil externo (ORCID)
      setIsForeignProfile(true);
      setIsCurrentUser(false);
      
      if (!hasRun.current) {
        hasRun.current = true;
        fetchORCIDBasicData(id);
      }
    } else {
      // É um perfil interno - usar a lógica original
      setIsForeignProfile(false);
      
      // Marca que está carregando e carrega os dados
      loadResearcherData(id, (loadedResearcher) => {
        if (loadedResearcher) {
          setResearcher(loadedResearcher);
          setIsCurrentUser(id === 'current');
        } else {
          setResearcher(null);
          // Mostra mensagem de erro
          toast({
            title: "Pesquisador não encontrado",
            description: "Não foi possível encontrar um pesquisador com o ID fornecido.",
            variant: "destructive"
          });
        }
      });
    }
  }, [id]);

  // Atualizar researcher com publicações e projetos quando eles carregarem
  useEffect(() => {
    if (researcher && isForeignProfile && (allPublications.length > 0 || allProjects.length > 0)) {
      setResearcher(prevResearcher => ({
        ...prevResearcher!,
        publications: allPublications,
        projects: allProjects,
      }));
    }
  }, [allPublications, allProjects, researcher, isForeignProfile]);

  // Paginação para perfis internos (em memória)
  const getInternalPublicationsPagination = useMemo(() => {
    if (!researcher || isForeignProfile) return null;
    
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
  }, [researcher, publicationsPage, isForeignProfile]);

  const getInternalProjectsPagination = useMemo(() => {
    if (!researcher || isForeignProfile) return null;
    
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
  }, [researcher, projectsPage, isForeignProfile]);

  // Paginação para perfis ORCID (em memória também, agora que temos todos os dados)
  const getORCIDPublicationsPagination = useMemo(() => {
    if (!isForeignProfile) return null;
    
    const startIndex = (publicationsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = allPublications.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      currentPage: publicationsPage,
      totalPages: Math.ceil(allPublications.length / ITEMS_PER_PAGE),
      totalItems: allPublications.length,
      hasNextPage: endIndex < allPublications.length,
      hasPrevPage: publicationsPage > 1,
    };
  }, [allPublications, publicationsPage, isForeignProfile]);

  const getORCIDProjectsPagination = useMemo(() => {
    if (!isForeignProfile) return null;
    
    const startIndex = (projectsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = allProjects.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      currentPage: projectsPage,
      totalPages: Math.ceil(allProjects.length / ITEMS_PER_PAGE),
      totalItems: allProjects.length,
      hasNextPage: endIndex < allProjects.length,
      hasPrevPage: projectsPage > 1,
    };
  }, [allProjects, projectsPage, isForeignProfile]);

  // Handlers para perfis internos e ORCID
  const handlePublicationsPageChange = (newPage: number) => {
    setPublicationsPage(newPage);
  };

  const handleProjectsPageChange = (newPage: number) => {
    setProjectsPage(newPage);
  };

  // Tela de carregamento - apenas para o perfil básico
  if (loading || (isForeignProfile && foreignStatus === 'loading')) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Carregando perfil do pesquisador...</p>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (!researcher || (isForeignProfile && foreignStatus === 'error')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-4">Pesquisador não encontrado</h2>
            <p className="mb-6">
              {isForeignProfile && errorMessage 
                ? errorMessage 
                : "Não foi possível encontrar um pesquisador com o ID fornecido."
              }
            </p>
            {isForeignProfile ? (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry}>Tentar Novamente</Button>
                <Button onClick={() => navigate('/search')} variant="outline">Voltar para Busca</Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/search')}>Voltar para Busca</Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Se for o usuário atual (perfil próprio) - apenas para perfis internos
  if (isCurrentUser) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6">
        <div className="container mx-auto px-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>
        </div>
        
        <ResearcherProfile 
          researcher={researcher} 
          isEditable={true}
          publicationsPagination={getInternalPublicationsPagination!}
          onPublicationsPageChange={handlePublicationsPageChange}
          projectsPagination={getInternalProjectsPagination!}
          onProjectsPageChange={handleProjectsPageChange}
          isMemoryPagination={true}
        />
      </div>
    );
  }

  // Para outros pesquisadores (não editável, com tabs)
  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      <div className="container mx-auto px-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>

      <div className="container mx-auto px-4">
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="mb-6 bg-blue-50 border border-blue-100">
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              Perfil
              {isForeignProfile && foreignStatus === 'success' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="publicacoes" className="flex items-center gap-2">
              Publicações 
              {publicationsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!publicationsLoading && allPublications.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {allPublications.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projetos" className="flex items-center gap-2">
              Projetos
              {projectsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!projectsLoading && allProjects.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {allProjects.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="perfil" className="mt-0">
            <ResearcherProfile 
              researcher={researcher} 
              isEditable={false}
              publicationsPagination={isForeignProfile ? getORCIDPublicationsPagination! : getInternalPublicationsPagination!}
              onPublicationsPageChange={handlePublicationsPageChange}
              projectsPagination={isForeignProfile ? getORCIDProjectsPagination! : getInternalProjectsPagination!}
              onProjectsPageChange={handleProjectsPageChange}
              isMemoryPagination={true} // Agora sempre true, pois dados estão em memória
              publicationsLoading={publicationsLoading}
              projectsLoading={projectsLoading}
            />
          </TabsContent>
          
          <TabsContent value="publicacoes" className="mt-0">
            <OtherResearcherPublications 
              publications={isForeignProfile ? allPublications : researcher.publications}
            />
          </TabsContent>
          
          <TabsContent value="projetos" className="mt-0">
            <OtherResearcherProjects 
              projects={isForeignProfile ? allProjects : researcher.projects}
              publications={isForeignProfile ? allPublications : researcher.publications}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Funções auxiliares para extrair dados do perfil ORCID
const getAffiliation = (profile: any): string => {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['organization']?.name || '';
  }
  return '';
};

const getDepartment = (profile: any): string => {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['department-name'] || '';
  }
  return '';
};

const getRole = (profile: any): string => {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['role-title'] || '';
  }
  return '';
};

const getBio = (profile: any): string => {
  return profile.person?.biography?.content || '';
};

const getEmail = (profile: any): string => {
  const emails = profile.person?.emails?.email;
  if (emails && emails.length > 0) {
    return emails[0].email || '';
  }
  return '';
};

const getResearchAreas = (profile: any): string[] => {
  const keywords = profile.person?.keywords?.keyword;
  if (keywords) {
    return keywords.map((kw: any) => kw.content).filter(Boolean);
  }
  return [];
};

const getEducation = (profile: any): string[] => {
  const educations = profile['activities-summary']?.educations?.['affiliation-group'];
  if (educations) {
    return educations.map((group: any) => {
      const edu = group.summaries[0];
      const org = edu.organization?.name || '';
      const role = edu['role-title'] || '';
      return `${role} - ${org}`.trim();
    }).filter(Boolean);
  }
  return [];
};

const getAwards = (profile: any): string[] => {
  return [];
};

const getExternalLinks = (profile: any): Array<{ name: string; url: string }> => {
  const urls = profile.person?.['researcher-urls']?.['researcher-url'];
  if (urls) {
    return urls.map((url: any) => ({
      name: url['url-name'] || 'Link Externo',
      url: url.url?.value || '',
    })).filter((link: any) => link.url);
  }
  return [];
};

export default ResearcherProfilePage;
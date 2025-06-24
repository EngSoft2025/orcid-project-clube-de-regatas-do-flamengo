import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, Users, Building, BookOpen, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

// Interface para os filtros de busca do ORCID
interface SearchFilters {
  'given-names'?: string;
  'family-name'?: string;
  'orcid'?: string;
  'email'?: string;
  'affiliation-org-name'?: string;
  'keyword'?: string;
  'other-names'?: string;
  'grant-number'?: string;
  'digital-object-id'?: string;
}

// Interface simplificada para resultados de busca (só o que é mostrado)
interface SearchResult {
  name: string;
  orcidId: string;
  institution: string;
  department: string;
  role: string;
  bio: string;
  researchAreas: string[];
  publicationsCount: number;
}

// Interface para controle de paginação
interface PaginationState {
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
  hasNextPage: boolean;
}

const SearchComponent: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Estados para paginação
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalResults: 0,
    resultsPerPage: 10,
    hasNextPage: false
  });

  // Cache para evitar buscas desnecessárias
  const [cachedResults, setCachedResults] = useState<Map<number, SearchResult[]>>(new Map());
  const [lastSearchParams, setLastSearchParams] = useState<string>('');

  const API_BASE_URL = 'http://localhost:3000';

  // Função para construir query de busca do ORCID
  const buildORCIDQuery = (): string => {
    const queryParts: string[] = [];
    
    // Busca geral
    if (searchQuery.trim()) {
      queryParts.push(searchQuery.trim());
    }
    
    // Filtros específicos
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value.trim()) {
        queryParts.push(`${field}:"${value.trim()}"`);
      }
    });
    
    return queryParts.join(' AND ');
  };

  // Função para gerar uma chave única dos parâmetros de busca
  const getSearchParamsKey = (): string => {
    return JSON.stringify({ query: searchQuery, filters });
  };

  // Helper functions para extrair dados básicos do perfil ORCID
  const getDisplayName = (profile: any): string => {
    const person = profile.person;
    if (person?.name) {
      const given = person.name['given-names']?.value || '';
      const family = person.name['family-name']?.value || '';
      return `${given} ${family}`.trim();
    }
    return 'Unknown Researcher';
  };

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

  const getResearchAreas = (profile: any): string[] => {
    const keywords = profile.person?.keywords?.keyword;
    if (keywords) {
      return keywords.map((kw: any) => kw.content).filter(Boolean);
    }
    return [];
  };

  const getPublicationsCount = (profile: any): number => {
    const works = profile['activities-summary']?.works?.group;
    return works ? works.length : 0;
  };

  // Função otimizada para buscar apenas dados básicos de um pesquisador
  const fetchBasicResearcherData = async (orcidId: string): Promise<SearchResult | null> => {
    try {
      // Buscar apenas o perfil básico (sem publicações detalhadas)
      const profileResponse = await fetch(`${API_BASE_URL}/api/orcid/profile/${orcidId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        console.error(`Failed to fetch profile for ${orcidId}`);
        return null;
      }

      const profileData = await profileResponse.json();

      // Criar objeto SearchResult com apenas dados básicos
      const searchResult: SearchResult = {
        name: getDisplayName(profileData),
        orcidId,
        institution: getAffiliation(profileData),
        department: getDepartment(profileData),
        role: getRole(profileData),
        bio: getBio(profileData),
        researchAreas: getResearchAreas(profileData),
        publicationsCount: getPublicationsCount(profileData),
      };

      return searchResult;
    } catch (error) {
      console.error(`Error fetching basic data for ${orcidId}:`, error);
      return null;
    }
  };

  // Função principal para buscar no ORCID com paginação
  const searchORCID = async (page: number = 1, isNewSearch: boolean = false) => {
    const currentSearchParams = getSearchParamsKey();
    
    // Se é uma nova busca, limpar cache e resultados
    if (isNewSearch) {
      setCachedResults(new Map());
      setSearchResults([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      setLastSearchParams(currentSearchParams);
      page = 1;
    }
    
    // Verificar se já temos os resultados desta página no cache
    if (cachedResults.has(page) && currentSearchParams === lastSearchParams) {
      setSearchResults(cachedResults.get(page) || []);
      setPagination(prev => ({ ...prev, currentPage: page }));
      return;
    }

    setIsSearching(true);
    if (isNewSearch) {
      setHasSearched(true);
    }
    
    try {
      const query = buildORCIDQuery();
      if (!query) {
        setSearchResults([]);
        setPagination({
          currentPage: 1,
          totalResults: 0,
          resultsPerPage: 10,
          hasNextPage: false
        });
        return;
      }

      // Calcular offset para paginação (ORCID usa start em vez de page)
      const start = (page - 1) * pagination.resultsPerPage;
      
      // Primeira busca - obter IDs dos pesquisadores com paginação
      const searchUrl = `${API_BASE_URL}/api/orcid/search?q=${encodeURIComponent(query)}&start=${start}&rows=${pagination.resultsPerPage}`;
      
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error('Falha na busca do ORCID');
      }

      const data = await response.json();
      console.log(data);
      const orcidIds = data.result?.map((item: any) => item['orcid-identifier']?.path).filter(Boolean) || [];
      const totalResults = data['num-found'] || 0;

      // Atualizar informações de paginação
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalResults,
        hasNextPage: (start + pagination.resultsPerPage) < totalResults
      }));

      if (orcidIds.length === 0) {
        const emptyResults: SearchResult[] = [];
        setSearchResults(emptyResults);
        // Cachear página vazia
        setCachedResults(prev => new Map(prev).set(page, emptyResults));
        return;
      }

      // Segunda etapa - buscar apenas dados básicos de cada pesquisador
      console.log(`Página ${page}: Encontrados ${orcidIds.length} pesquisadores. Buscando dados básicos...`);
      
      const researcherPromises = orcidIds.map(orcidId => fetchBasicResearcherData(orcidId));
      const researchers = await Promise.all(researcherPromises);
      
      // Filtrar resultados válidos
      const validResearchers = researchers.filter(r => r !== null) as SearchResult[];
      
      setSearchResults(validResearchers);
      
      // Cachear os resultados desta página
      setCachedResults(prev => new Map(prev).set(page, validResearchers));
      
    } catch (error) {
      console.error('Erro na busca ORCID:', error);
      alert('Erro ao buscar no ORCID. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Função para ir para página anterior
  const goToPreviousPage = () => {
    if (pagination.currentPage > 1) {
      searchORCID(pagination.currentPage - 1);
    }
  };

  // Função para ir para próxima página
  const goToNextPage = () => {
    if (pagination.hasNextPage) {
      searchORCID(pagination.currentPage + 1);
    }
  };

  // Função para ir para uma página específica
  const goToPage = (page: number) => {
    const maxPage = Math.ceil(pagination.totalResults / pagination.resultsPerPage);
    if (page >= 1 && page <= maxPage) {
      searchORCID(page);
    }
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setCachedResults(new Map());
    setPagination({
      currentPage: 1,
      totalResults: 0,
      resultsPerPage: 10,
      hasNextPage: false
    });
  };

  // Função para navegar para o perfil do pesquisador - ALTERADA
  const viewProfile = (orcidId: string) => {
    navigate(`/researcher/${orcidId}`);
  };

  // Função para buscar quando pressionar Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchORCID(1, true);
    }
  };

  // Calcular informações de paginação para exibição
  const totalPages = Math.ceil(pagination.totalResults / pagination.resultsPerPage);
  const startResult = ((pagination.currentPage - 1) * pagination.resultsPerPage) + 1;
  const endResult = Math.min(pagination.currentPage * pagination.resultsPerPage, pagination.totalResults);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Buscar Pesquisadores no ORCID</h1>
      
      {/* Card com controles de busca */}
      <Card className="p-6 bg-white border-blue-100 mb-8">
        <div className="space-y-4">
          {/* Campo de busca principal */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Busca geral (nome, instituição, área de pesquisa...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 border-blue-200"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Filtros Avançados
            </Button>
            <Button
              onClick={() => searchORCID(1, true)}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Filtros Avançados ORCID</h3>
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} className="mr-1" />
                  Limpar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <Input
                    placeholder="Nome do pesquisador"
                    value={filters['given-names'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'given-names': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                  <Input
                    placeholder="Sobrenome do pesquisador"
                    value={filters['family-name'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'family-name': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ORCID ID</label>
                  <Input
                    placeholder="0000-0000-0000-0000"
                    value={filters['orcid'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'orcid': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instituição</label>
                  <Input
                    placeholder="Nome da instituição"
                    value={filters['affiliation-org-name'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'affiliation-org-name': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-chave</label>
                  <Input
                    placeholder="Área de pesquisa"
                    value={filters['keyword'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'keyword': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DOI</label>
                  <Input
                    placeholder="Digital Object Identifier"
                    value={filters['digital-object-id'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'digital-object-id': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Grant</label>
                  <Input
                    placeholder="Número do financiamento"
                    value={filters['grant-number'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'grant-number': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outros Nomes</label>
                  <Input
                    placeholder="Nomes alternativos"
                    value={filters['other-names'] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'other-names': e.target.value }))}
                    className="border-gray-300"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => searchORCID(1, true)}
                  disabled={isSearching}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSearching ? 'Buscando...' : 'Aplicar Filtros'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Indicador de busca e paginação */}
      {hasSearched && (
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {isSearching ? 'Buscando no ORCID...' : 
                pagination.totalResults > 0 ? 
                  `Mostrando ${startResult}-${endResult} de ${pagination.totalResults} resultados` :
                  'Nenhum resultado encontrado'
              }
            </p>
            {pagination.totalResults > 0 && (
              <p className="text-xs text-gray-500">
                Página {pagination.currentPage} de {totalPages}
              </p>
            )}
          </div>
          
          {/* Controles de paginação */}
          {pagination.totalResults > pagination.resultsPerPage && (
            <div className="flex items-center gap-2">
              <Button
                onClick={goToPreviousPage}
                disabled={pagination.currentPage === 1 || isSearching}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Anterior
              </Button>
              
              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      disabled={isSearching}
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                onClick={goToNextPage}
                disabled={!pagination.hasNextPage || isSearching}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                Próximo
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Lista de pesquisadores */}
      <div className="space-y-6">
        {searchResults.map(researcher => (
          <Card 
            key={researcher.orcidId} 
            className="p-6 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => viewProfile(researcher.orcidId)}
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-20 h-20">
                <User size={36} />
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-blue-800 mb-2">{researcher.name}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-3">
                  {researcher.institution && (
                    <div className="flex items-center text-gray-600">
                      <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{researcher.institution}</span>
                    </div>
                  )}
                  
                  {researcher.department && (
                    <div className="flex items-center text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{researcher.department}</span>
                    </div>
                  )}
                  
                  {researcher.role && (
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{researcher.role}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600">
                    <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{researcher.publicationsCount} publicações</span>
                  </div>
                </div>
                
                {researcher.researchAreas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {researcher.researchAreas.slice(0, 3).map((area, index) => (
                      <span 
                        key={index} 
                        className="bg-blue-50 text-blue-700 px-3 py-1 text-xs rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                    {researcher.researchAreas.length > 3 && (
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 text-xs rounded-full">
                        +{researcher.researchAreas.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {researcher.bio && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {researcher.bio}
                  </p>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    ORCID: {researcher.orcidId}
                  </span>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2 text-blue-600 border-blue-200"
                  >
                    Ver Perfil
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Mensagem quando nenhum pesquisador é encontrado */}
        {searchResults.length === 0 && hasSearched && !isSearching && (
          <div className="text-center py-10">
            <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum pesquisador encontrado</h3>
            <p className="text-gray-500">
              Tente ajustar os filtros de busca ou usar termos diferentes.
            </p>
          </div>
        )}

        {/* Mensagem inicial quando não há busca */}
        {!hasSearched && (
          <div className="text-center py-10">
            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Busque pesquisadores no ORCID</h3>
            <p className="text-gray-500">
              Digite um termo de busca ou use os filtros avançados para encontrar pesquisadores.
            </p>
          </div>
        )}
      </div>

      {/* Controles de paginação no final (repetidos para conveniência) */}
      {pagination.totalResults > pagination.resultsPerPage && hasSearched && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              onClick={goToPreviousPage}
              disabled={pagination.currentPage === 1 || isSearching}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Anterior
            </Button>
            
            {/* Números das páginas */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={isSearching}
                    variant={pageNum === pagination.currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={goToNextPage}
              disabled={!pagination.hasNextPage || isSearching}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              Próximo
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
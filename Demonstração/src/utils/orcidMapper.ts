
import { Researcher, Publication, Project, Author } from '../types';

/* 
 * Utilitários para mapear dados entre a API do ORCID e nossas interfaces TypeScript
 * 
 * A API do ORCID usa uma estrutura XML/JSON específica que precisa ser mapeada
 * para nossas interfaces mais simples e amigáveis ao frontend.
 */

/**
 * Mapeia dados do perfil ORCID para nossa interface Researcher
 * 
 * Endpoint: https://pub.orcid.org/v3.0/{orcid-id}/record
 * 
 * Estrutura esperada da API do ORCID:
 * {
 *   "orcid-identifier": { "path": "0000-0000-0000-0000" },
 *   "person": {
 *     "name": { "given-names": { "value": "Nome" }, "family-name": { "value": "Sobrenome" } },
 *     "biography": { "content": "Biografia do pesquisador..." },
 *     "researcher-urls": { "researcher-url": [...] },
 *     "keywords": { "keyword": [...] }
 *   },
 *   "activities-summary": {
 *     "works": { "group": [...] },
 *     "fundings": { "group": [...] }
 *   }
 * }
 */
export const mapOrcidToResearcher = (orcidData: any): Researcher => {
  const person = orcidData.person || {};
  const name = person.name || {};
  const biography = person.biography || {};
  const researcherUrls = person['researcher-urls']?.['researcher-url'] || [];
  const keywords = person.keywords?.keyword || [];
  const employments = person.employments?.['affiliation-group'] || [];
  
  // Buscar afiliação mais recente
  const currentEmployment = employments[0]?.summaries?.[0] || {};
  const organization = currentEmployment.organization || {};
  
  return {
    name: `${name['given-names']?.value || ''} ${name['family-name']?.value || ''}`.trim(),
    orcidId: orcidData['orcid-identifier']?.path || '',
    institution: organization.name || '',
    department: currentEmployment['department-name'] || '',
    role: currentEmployment['role-title'] || '',
    bio: biography.content || '',
    email: '', // Email não é público na API do ORCID
    researchAreas: keywords.map((k: any) => k.content || ''),
    education: [], // Implementar se necessário
    awards: [], // Implementar se necessário
    institutionalPage: researcherUrls.find((url: any) => url.name === 'institutional')?.url?.value || '',
    externalLinks: researcherUrls.map((url: any) => ({
      name: url.name || '',
      url: url.url?.value || ''
    })),
    publications: [], // Será preenchido separadamente
    projects: [] // Será preenchido separadamente
  };
};

/**
 * Mapeia dados de work ORCID para nossa interface Publication
 * 
 * Endpoint: https://pub.orcid.org/v3.0/{orcid-id}/work/{put-code}
 * 
 * Estrutura esperada da API do ORCID:
 * {
 *   "title": { "title": { "value": "Título da publicação" } },
 *   "journal-title": { "value": "Nome do journal" },
 *   "type": "journal-article",
 *   "publication-date": { "year": { "value": "2023" } },
 *   "external-ids": { "external-id": [...] },
 *   "contributors": { "contributor": [...] },
 *   "short-description": "Abstract..."
 * }
 */
export const mapOrcidWorkToPublication = (workData: any): Publication => {
  const title = workData.title?.title?.value || '';
  const journalTitle = workData['journal-title']?.value || '';
  const type = workData.type || 'journal-article';
  const year = parseInt(workData['publication-date']?.year?.value || '0');
  const contributors = workData.contributors?.contributor || [];
  const externalIds = workData['external-ids']?.['external-id'] || [];
  
  // Mapear contribuidores para autores
  const authors: Author[] = contributors.map((contributor: any) => ({
    name: contributor['credit-name']?.value || '',
    orcidId: contributor['contributor-orcid']?.path || ''
  }));
  
  // Buscar DOI ou outro identificador
  const identifier = externalIds[0] || { type: '', value: '' };
  
  return {
    id: workData['put-code']?.toString() || '',
    title,
    authors,
    year,
    type: mapOrcidWorkTypeToDisplayType(type),
    source: journalTitle,
    identifier: {
      type: identifier.type || 'DOI',
      value: identifier.value || ''
    },
    abstract: workData['short-description'] || '',
    links: [], // URLs podem estar em external-ids
    project: '' // Implementar associação com projetos se necessário
  };
};

/**
 * Mapeia dados de funding ORCID para nossa interface Project
 * 
 * Endpoint: https://pub.orcid.org/v3.0/{orcid-id}/funding/{put-code}
 */
export const mapOrcidFundingToProject = (fundingData: any): Project => {
  const title = fundingData.title?.title?.value || '';
  const organization = fundingData.organization || {};
  const startDate = fundingData['start-date'] || {};
  const endDate = fundingData['end-date'] || {};
  
  return {
    id: fundingData['put-code']?.toString() || '',
    name: title,
    title,
    description: fundingData['short-description'] || '',
    startYear: parseInt(startDate.year?.value || '0'),
    endYear: endDate.year?.value ? parseInt(endDate.year.value) : 'Atual',
    funding: `${fundingData.amount?.value || ''} ${fundingData.amount?.['currency-code'] || ''}`.trim(),
    fundingAgency: organization.name || '',
    role: fundingData.type || '',
    publications: [] // Será preenchido por associação
  };
};

/**
 * Mapeia nossa interface Researcher para formato ORCID para salvamento
 */
export const mapResearcherToOrcidFormat = (researcher: Researcher) => {
  const [givenNames, ...familyNameParts] = researcher.name.split(' ');
  const familyName = familyNameParts.join(' ');
  
  return {
    biography: {
      content: researcher.bio,
      visibility: 'public'
    },
    keywords: {
      keyword: researcher.researchAreas.map(area => ({
        content: area,
        visibility: 'public'
      }))
    },
    researcherUrls: {
      'researcher-url': researcher.externalLinks.map((link, index) => ({
        'put-code': index,
        url: { value: link.url },
        name: link.name,
        visibility: 'public'
      }))
    },
    name: {
      'given-names': { value: givenNames },
      'family-name': { value: familyName },
      visibility: 'public'
    }
  };
};

/**
 * Mapeia nossa interface Publication para formato ORCID Work
 */
export const mapPublicationToOrcidWork = (publication: Publication) => {
  return {
    title: {
      title: { value: publication.title }
    },
    'journal-title': { value: publication.source },
    type: mapDisplayTypeToOrcidWorkType(publication.type),
    'publication-date': {
      year: { value: publication.year.toString() }
    },
    'external-ids': {
      'external-id': [{
        'external-id-type': publication.identifier.type.toLowerCase(),
        'external-id-value': publication.identifier.value,
        'external-id-relationship': 'self'
      }]
    },
    contributors: {
      contributor: publication.authors.map((author, index) => ({
        'contributor-orcid': author.orcidId ? { path: author.orcidId } : null,
        'credit-name': { value: author.name },
        'contributor-attributes': {
          'contributor-sequence': index === 0 ? 'first' : 'additional',
          'contributor-role': 'author'
        }
      }))
    },
    'short-description': publication.abstract,
    visibility: 'public'
  };
};

/**
 * Utilitários para mapear tipos de trabalho entre ORCID e nossa interface
 */
const mapOrcidWorkTypeToDisplayType = (orcidType: string): string => {
  const typeMap: { [key: string]: string } = {
    'journal-article': 'Journal Article',
    'conference-paper': 'Conference Paper',
    'book-chapter': 'Book Chapter',
    'book': 'Book',
    'report': 'Report',
    'working-paper': 'Working Paper',
    'dissertation': 'Dissertation',
    'other': 'Other'
  };
  
  return typeMap[orcidType] || 'Other';
};

const mapDisplayTypeToOrcidWorkType = (displayType: string): string => {
  const typeMap: { [key: string]: string } = {
    'Journal Article': 'journal-article',
    'Conference Paper': 'conference-paper',
    'Book Chapter': 'book-chapter',
    'Book': 'book',
    'Report': 'report',
    'Working Paper': 'working-paper',
    'Dissertation': 'dissertation',
    'Other': 'other'
  };
  
  return typeMap[displayType] || 'other';
};

/**
 * Função para fazer fetch com tratamento de erro padrão da API do ORCID
 */
export const fetchOrcidData = async (url: string, accessToken?: string) => {
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Erro na API do ORCID: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados do ORCID:', error);
    throw error;
  }
};

/**
 * Função para buscar dados completos de um pesquisador via ORCID
 */
export const fetchCompleteResearcherData = async (orcidId: string, accessToken?: string): Promise<Researcher> => {
  try {
    // Buscar dados básicos do perfil
    const profileData = await fetchOrcidData(`https://pub.orcid.org/v3.0/${orcidId}/record`, accessToken);
    const researcher = mapOrcidToResearcher(profileData);
    
    // Buscar lista de works
    const worksData = await fetchOrcidData(`https://pub.orcid.org/v3.0/${orcidId}/works`, accessToken);
    const workGroups = worksData.group || [];
    
    // Buscar detalhes de cada work
    const publications: Publication[] = [];
    for (const group of workGroups.slice(0, 20)) { // Limitar a 20 para performance
      const putCode = group['work-summary'][0]['put-code'];
      const workData = await fetchOrcidData(`https://pub.orcid.org/v3.0/${orcidId}/work/${putCode}`, accessToken);
      publications.push(mapOrcidWorkToPublication(workData));
    }
    
    // Buscar dados de funding (projetos)
    const fundingData = await fetchOrcidData(`https://pub.orcid.org/v3.0/${orcidId}/fundings`, accessToken);
    const fundingGroups = fundingData.group || [];
    
    const projects: Project[] = [];
    for (const group of fundingGroups.slice(0, 10)) { // Limitar a 10 para performance
      const putCode = group['funding-summary'][0]['put-code'];
      const fundingDetails = await fetchOrcidData(`https://pub.orcid.org/v3.0/${orcidId}/funding/${putCode}`, accessToken);
      projects.push(mapOrcidFundingToProject(fundingDetails));
    }
    
    return {
      ...researcher,
      publications,
      projects
    };
  } catch (error) {
    console.error('Erro ao buscar dados completos do pesquisador:', error);
    throw error;
  }
};

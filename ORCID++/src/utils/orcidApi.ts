import { Researcher, Publication, Author, Identifier } from '../types';

export const ORCID_CONFIG = {
  CLIENT_ID: 'APP-GVPBMVHOEBR3RKKI',
  CLIENT_SECRET: '627be347-8fb5-4f90-976b-d18ecdbf6eb4',
  REDIRECT_URI: 'http://172.24.59.101:8080/login/callback',
  BASE_URL: 'https://pub.orcid.org/v3.0',
  AUTH_URL: 'https://orcid.org/oauth',
};

export interface OrcidTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  orcid: string;
  name?: string;
}

export class OrcidApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${ORCID_CONFIG.BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ORCID API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getProfile(orcidId: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/record`);
  }

  async getWorks(orcidId: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/works`);
  }

  async getWork(orcidId: string, putCode: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/work/${putCode}`);
  }

  async getEducations(orcidId: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/educations`);
  }

  async getEmployments(orcidId: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/employments`);
  }

  async getFundings(orcidId: string): Promise<any> {
    return this.makeRequest(`/${orcidId}/fundings`);
  }
}

export async function exchangeCodeForToken(code: string, state: string): Promise<OrcidTokenResponse> {
  const response = await fetch(`${ORCID_CONFIG.AUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: ORCID_CONFIG.CLIENT_ID,
      client_secret: ORCID_CONFIG.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ORCID_CONFIG.REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for token: ${errorText}`);
  }

  return response.json();
}

export function mapOrcidProfileToResearcher(profile: any, publications: Publication[] = []): Researcher {
  return {
    name: getDisplayName(profile),
    orcidId: profile['orcid-identifier']?.path || '',
    institution: getAffiliation(profile),
    department: getDepartment(profile),
    role: getRole(profile),
    bio: getBio(profile),
    email: getEmail(profile),
    researchAreas: getResearchAreas(profile),
    education: getEducation(profile),
    awards: getAwards(profile),
    institutionalPage: '',
    externalLinks: getExternalLinks(profile),
    publications,
    projects: [], // Projects need to be handled separately or mapped from funding data
  };
}

export function mapOrcidWorkToPublication(work: any, authors: Author[] = []): Publication {
  const title = work.title?.title?.value || 'Untitled';
  const year = work['publication-date']?.year?.value || new Date().getFullYear();
  const type = work.type || 'journal-article';
  const journal = work['journal-title']?.value || '';

  // Extract external identifiers
  let identifier: Identifier = { type: 'other', value: '' };
  if (work['external-ids']?.['external-id']?.length > 0) {
    const extId = work['external-ids']['external-id'][0];
    identifier = {
      type: extId['external-id-type'] || 'other',
      value: extId['external-id-value'] || '',
    };
  }

  // Extract contributors if authors not provided
  if (authors.length === 0 && work.contributors?.contributor) {
    work.contributors.contributor.forEach((contributor: any) => {
      if (contributor['credit-name']?.value) {
        authors.push({
          name: contributor['credit-name'].value,
          orcidId: contributor['contributor-orcid']?.path || '',
        });
      }
    });
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
    links: extractWorkLinks(work),
  };
}

// Helper functions
function getDisplayName(profile: any): string {
  const person = profile.person;
  if (person?.name) {
    const given = person.name['given-names']?.value || '';
    const family = person.name['family-name']?.value || '';
    return `${given} ${family}`.trim();
  }
  return 'Unknown Researcher';
}

function getAffiliation(profile: any): string {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['organization']?.name || '';
  }
  return '';
}

function getDepartment(profile: any): string {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['department-name'] || '';
  }
  return '';
}

function getRole(profile: any): string {
  const employments = profile['activities-summary']?.employments?.['affiliation-group'];
  if (employments && employments.length > 0) {
    const employment = employments[0].summaries[0];
    return employment['role-title'] || '';
  }
  return '';
}

function getBio(profile: any): string {
  return profile.person?.biography?.content || '';
}

function getEmail(profile: any): string {
  const emails = profile.person?.emails?.email;
  if (emails && emails.length > 0) {
    return emails[0].email || '';
  }
  return '';
}

function getResearchAreas(profile: any): string[] {
  const keywords = profile.person?.keywords?.keyword;
  if (keywords) {
    return keywords.map((kw: any) => kw.content).filter(Boolean);
  }
  return [];
}

function getEducation(profile: any): string[] {
  const educations = profile['activities-summary']?.educations?.['affiliation-group'];
  if (educations) {
    return educations.map((group: any) => {
      const edu = group.summaries[0];
      const org = edu.organization?.name || '';
      const role = edu['role-title'] || '';
      const startDate = edu['start-date'] ? `${edu['start-date'].year?.value || ''}` : '';
      const endDate = edu['end-date'] ? `${edu['end-date'].year?.value || ''}` : '';
      const dateRange = startDate && endDate ? ` (${startDate}-${endDate})` : startDate ? ` (${startDate})` : '';
      return `${role} - ${org}${dateRange}`.trim();
    }).filter(Boolean);
  }
  return [];
}

function getAwards(profile: any): string[] {
  // ORCID doesn't have a standard awards section
  // This could be implemented by parsing peer-reviews or other sections
  const distinctions = profile['activities-summary']?.['distinctions']?.['affiliation-group'];
  if (distinctions) {
    return distinctions.map((group: any) => {
      const distinction = group.summaries[0];
      const org = distinction.organization?.name || '';
      const role = distinction['role-title'] || 'Award';
      const year = distinction['start-date']?.year?.value || '';
      return `${role} - ${org} ${year ? `(${year})` : ''}`.trim();
    }).filter(Boolean);
  }
  return [];
}

function getExternalLinks(profile: any): Array<{ name: string; url: string }> {
  const urls = profile.person?.['researcher-urls']?.['researcher-url'];
  if (urls) {
    return urls.map((url: any) => ({
      name: url['url-name'] || 'External Link',
      url: url.url?.value || '',
    })).filter((link: any) => link.url);
  }
  return [];
}

function extractWorkLinks(work: any): Array<{ name: string; url: string }> {
  const links: Array<{ name: string; url: string }> = [];
  
  // Extract URL from external identifiers
  if (work['external-ids']?.['external-id']) {
    work['external-ids']['external-id'].forEach((extId: any) => {
      if (extId['external-id-url']?.value) {
        links.push({
          name: `${extId['external-id-type'] || 'External'} Link`,
          url: extId['external-id-url'].value,
        });
      }
    });
  }

  // Extract URL from work itself if available
  if (work.url?.value) {
    links.push({
      name: 'Publication URL',
      url: work.url.value,
    });
  }

  return links;
}

export async function searchOrcidProfiles(query: string, limit: number = 20): Promise<any> {
  const searchUrl = `${ORCID_CONFIG.BASE_URL}/search/?q=${encodeURIComponent(query)}&rows=${limit}`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ORCID search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function generateOrcidAuthUrl(state?: string): string {
  const stateParam = state || Math.random().toString(36).substring(2, 15);
  
  const params = new URLSearchParams({
    client_id: ORCID_CONFIG.CLIENT_ID,
    response_type: 'code',
    scope: '/authenticate',
    redirect_uri: ORCID_CONFIG.REDIRECT_URI,
    state: stateParam,
  });

  return `${ORCID_CONFIG.AUTH_URL}/authorize?${params.toString()}`;
}
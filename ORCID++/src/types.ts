
export interface Author {
  name: string;
  orcidId: string;
}

export interface Link {
  name: string;
  url: string;
}

export interface Identifier {
  type: string;
  value: string;
}

export interface Publication {
  id?: string;
  title: string;
  authors: Author[];
  year: number;
  type: string;
  source: string;
  identifier: Identifier;
  abstract: string;
  links: Link[];
  project?: string;
}

export interface Project {
  id: string;
  name: string;
  title?: string;
  description: string;
  startYear: number;
  endYear: number | string;
  funding?: string;
  fundingAgency?: string;
  role?: string;
  publications?: Publication[];
}

export interface Researcher {
  name: string;
  orcidId: string;
  institution: string;
  department?: string;
  role?: string;
  bio: string;
  email?: string;
  researchAreas: string[];
  education?: string[];
  awards?: string[];
  institutionalPage: string;
  externalLinks: Link[];
  publications: Publication[];
  projects: Project[];
}

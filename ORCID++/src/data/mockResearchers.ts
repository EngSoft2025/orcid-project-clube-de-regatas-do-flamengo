
import { Researcher } from '../types';

export const mockResearchers: Researcher[] = [
  {
    name: "Maria Silva",
    orcidId: "0000-0002-1234-5678",
    institution: "Universidade de São Paulo",
    department: "Departamento de Ciência da Computação",
    bio: "Pesquisadora em Inteligência Artificial com foco em aprendizado de máquina e ciência de dados.",
    researchAreas: ["Inteligência Artificial", "Machine Learning", "Ciência de Dados"],
    institutionalPage: "https://www.usp.br/researcher/mariasilva",
    externalLinks: [
      { name: "Google Scholar", url: "https://scholar.google.com/citations?user=abc123" },
      { name: "ResearchGate", url: "https://www.researchgate.net/profile/Maria_Silva" }
    ],
    publications: [
      {
        id: "pub1",
        title: "Deep Learning para Análise de Imagens Médicas",
        authors: [
          { name: "Maria Silva", orcidId: "0000-0002-1234-5678" },
          { name: "João Santos", orcidId: "0000-0001-5678-1234" }
        ],
        year: 2022,
        type: "Journal Article",
        source: "Brazilian Journal of Medical Imaging",
        identifier: { type: "DOI", value: "10.1234/bjmi.2022.001" },
        abstract: "Este artigo apresenta uma nova abordagem de deep learning para análise de imagens médicas...",
        links: [
          { name: "PDF", url: "https://example.com/paper1.pdf" },
          { name: "Repositório de Código", url: "https://github.com/mariasilva/medical-imaging" }
        ],
        project: "IA para Saúde"
      },
      {
        id: "pub2",
        title: "Métodos de Feature Selection para Grandes Bases de Dados",
        authors: [
          { name: "Maria Silva", orcidId: "0000-0002-1234-5678" },
          { name: "Carlos Oliveira", orcidId: "0000-0003-9876-5432" }
        ],
        year: 2021,
        type: "Conference Paper",
        source: "Anais do XXXV Simpósio Brasileiro de Banco de Dados",
        identifier: { type: "ISBN", value: "978-65-87001-01-1" },
        abstract: "Este trabalho apresenta uma comparação de métodos de seleção de características...",
        links: [
          { name: "PDF", url: "https://example.com/paper2.pdf" }
        ]
      }
    ],
    projects: [
      {
        id: "ai-health",
        name: "IA para Saúde",
        description: "Desenvolvimento de modelos de IA para diagnóstico médico baseado em imagens.",
        startYear: 2021,
        endYear: 2024,
        funding: "FAPESP",
        role: "Coordenadora"
      },
      {
        id: "big-data",
        name: "Big Data Analytics",
        description: "Técnicas de mineração de dados para grandes volumes de dados heterogêneos.",
        startYear: 2020,
        endYear: 2023,
        funding: "CNPq"
      }
    ]
  },
  {
    name: "João Santos",
    orcidId: "0000-0001-5678-1234",
    institution: "Universidade Federal do Rio de Janeiro",
    department: "Instituto de Matemática",
    bio: "Pesquisador em Matemática Computacional e Estatística Aplicada.",
    researchAreas: ["Estatística Computacional", "Modelagem Matemática", "Análise Numérica"],
    institutionalPage: "https://www.ufrj.br/researcher/joaosantos",
    externalLinks: [
      { name: "Google Scholar", url: "https://scholar.google.com/citations?user=def456" },
      { name: "LinkedIN", url: "https://www.linkedin.com/in/joao-santos-math" }
    ],
    publications: [
      {
        id: "pub3",
        title: "Deep Learning para Análise de Imagens Médicas",
        authors: [
          { name: "Maria Silva", orcidId: "0000-0002-1234-5678" },
          { name: "João Santos", orcidId: "0000-0001-5678-1234" }
        ],
        year: 2022,
        type: "Journal Article",
        source: "Brazilian Journal of Medical Imaging",
        identifier: { type: "DOI", value: "10.1234/bjmi.2022.001" },
        abstract: "Este artigo apresenta uma nova abordagem de deep learning para análise de imagens médicas...",
        links: [
          { name: "PDF", url: "https://example.com/paper1.pdf" },
          { name: "Repositório de Código", url: "https://github.com/mariasilva/medical-imaging" }
        ],
        project: "Modelos Estatísticos para Medicina"
      },
      {
        id: "pub4",
        title: "Métodos Bayesianos para Previsão de Séries Temporais",
        authors: [
          { name: "João Santos", orcidId: "0000-0001-5678-1234" }
        ],
        year: 2020,
        type: "Journal Article",
        source: "Journal of Time Series Analysis",
        identifier: { type: "DOI", value: "10.1234/jtsa.2020.005" },
        abstract: "Este artigo apresenta novos métodos bayesianos para previsão de séries temporais...",
        links: [
          { name: "PDF", url: "https://example.com/paper3.pdf" }
        ],
        project: "Modelos Estatísticos para Medicina"
      }
    ],
    projects: [
      {
        id: "stats-med",
        name: "Modelos Estatísticos para Medicina",
        description: "Desenvolvimento de modelos estatísticos para análise de dados médicos.",
        startYear: 2019,
        endYear: 2023,
        funding: "FAPERJ",
        role: "Coordenador"
      }
    ]
  },
  {
    name: "Carlos Oliveira",
    orcidId: "0000-0003-9876-5432",
    institution: "Universidade Estadual de Campinas",
    department: "Faculdade de Engenharia Elétrica",
    bio: "Engenheiro e pesquisador na área de sistemas inteligentes e processamento de sinais.",
    researchAreas: ["Processamento de Sinais", "Machine Learning", "Sistemas Embarcados"],
    institutionalPage: "https://www.unicamp.br/researcher/carlosoliveira",
    externalLinks: [
      { name: "Google Scholar", url: "https://scholar.google.com/citations?user=ghi789" },
      { name: "ResearchGate", url: "https://www.researchgate.net/profile/Carlos_Oliveira" }
    ],
    publications: [
      {
        id: "pub5",
        title: "Métodos de Feature Selection para Grandes Bases de Dados",
        authors: [
          { name: "Maria Silva", orcidId: "0000-0002-1234-5678" },
          { name: "Carlos Oliveira", orcidId: "0000-0003-9876-5432" }
        ],
        year: 2021,
        type: "Conference Paper",
        source: "Anais do XXXV Simpósio Brasileiro de Banco de Dados",
        identifier: { type: "ISBN", value: "978-65-87001-01-1" },
        abstract: "Este trabalho apresenta uma comparação de métodos de seleção de características...",
        links: [
          { name: "PDF", url: "https://example.com/paper2.pdf" }
        ],
        project: "Sistemas Inteligentes"
      },
      {
        id: "pub6",
        title: "Processamento de Sinais de EEG para Interfaces Cérebro-Computador",
        authors: [
          { name: "Carlos Oliveira", orcidId: "0000-0003-9876-5432" },
          { name: "Ana Costa", orcidId: "0000-0004-1122-3344" }
        ],
        year: 2019,
        type: "Journal Article",
        source: "IEEE Transactions on Neural Systems",
        identifier: { type: "DOI", value: "10.1109/tns.2019.123456" },
        abstract: "Este artigo apresenta novos métodos de processamento de sinais de EEG...",
        links: [
          { name: "PDF", url: "https://example.com/paper4.pdf" },
          { name: "Dataset", url: "https://opendata.org/eeg-dataset" }
        ],
        project: "Sistemas Inteligentes"
      }
    ],
    projects: [
      {
        id: "smart-sys",
        name: "Sistemas Inteligentes",
        description: "Desenvolvimento de sistemas inteligentes para aplicações em engenharia biomédica.",
        startYear: 2018,
        endYear: 2022,
        funding: "FAPESP",
        role: "Pesquisador Principal"
      }
    ]
  }
];

export default mockResearchers;

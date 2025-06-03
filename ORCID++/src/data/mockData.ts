
import mockResearchers from './mockResearchers';

export { mockResearchers };

export const mockResearcherData = {
  name: "Maria Oliveira Silva",
  orcidId: "0000-0002-1234-5678",
  institution: "Universidade de São Paulo (ICMC-USP)",
  department: "Instituto de Ciências Matemáticas e de Computação",
  role: "Professora Associada",
  bio: "Pesquisadora na área de Ciência da Computação com foco em Inteligência Artificial e Aprendizado de Máquina aplicados a problemas complexos.",
  email: "mariasilva@usp.br",
  researchAreas: ["Inteligência Artificial", "Aprendizado de Máquina", "Processamento de Linguagem Natural", "Ciência de Dados"],
  institutionalPage: "https://example.com/researcher-page",
  externalLinks: [
    { name: "Google Scholar", url: "https://scholar.google.com" },
    { name: "ResearchGate", url: "https://www.researchgate.net" },
    { name: "Lattes CV", url: "http://lattes.cnpq.br" }
  ],
  publications: [
    {
      id: "p1",
      title: "Aplicações de Deep Learning para Detecção de Fraudes em Sistemas Financeiros",
      authors: [
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" },
        { name: "João Santos", orcidId: "0000-0003-2345-6789" }
      ],
      year: 2023,
      type: "Journal Article",
      source: "Journal of Applied Computing",
      identifier: { type: "DOI", value: "10.1109/TAC.2023.456789" },
      abstract: "Este artigo apresenta uma arquitetura avançada de redes neurais para detecção de fraudes em sistemas financeiros, alcançando precisão superior a métodos tradicionais.",
      links: [
        { name: "Versão publicada", url: "https://doi.org/10.1109/TAC.2023.456789" },
        { name: "Preprint", url: "https://arxiv.org/abs/2023.12345" }
      ],
      project: "IA para Segurança Financeira"
    },
    {
      id: "p2",
      title: "Modelos Transformers para Análise de Sentimentos em Português",
      authors: [
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" },
        { name: "Ana Pereira", orcidId: "0000-0001-5678-9012" }
      ],
      year: 2022,
      type: "Conference Paper",
      source: "Proceedings of the Brazilian Symposium on Artificial Intelligence",
      identifier: { type: "ISBN", value: "978-1-4503-1234-5" },
      abstract: "Desenvolvimento de modelos baseados em arquitetura Transformer para análise de sentimentos em português brasileiro, com foco em redes sociais.",
      links: [
        { name: "Versão publicada", url: "https://dl.acm.org/doi/10.1145/3512345.3456789" },
        { name: "Repositório GitHub", url: "https://github.com/example/sentiment-analysis" }
      ],
      project: "NLP para Língua Portuguesa"
    },
    {
      id: "p3",
      title: "Algoritmos de Otimização para Roteamento em Redes IoT",
      authors: [
        { name: "Carlos Ferreira", orcidId: "0000-0004-6789-0123" },
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" }
      ],
      year: 2021,
      type: "Journal Article",
      source: "IEEE Internet of Things Journal",
      identifier: { type: "DOI", value: "10.1109/JIOT.2021.123456" },
      abstract: "Proposta de novos algoritmos de otimização para roteamento eficiente em redes IoT com recursos limitados de energia.",
      links: [
        { name: "Versão publicada", url: "https://doi.org/10.1109/JIOT.2021.123456" }
      ],
      project: "Redes IoT Sustentáveis"
    },
    {
      id: "p4",
      title: "Técnicas de Mineração de Dados para Detecção de Padrões em Registros Médicos",
      authors: [
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" },
        { name: "Roberto Almeida", orcidId: "0000-0005-9876-5432" }
      ],
      year: 2021,
      type: "Book Chapter",
      source: "Advances in Data Mining for Healthcare",
      identifier: { type: "ISBN", value: "978-3-030-12345-6" },
      abstract: "Capítulo que apresenta métodos avançados de mineração de dados aplicados à detecção de padrões em registros médicos eletrônicos para apoio à decisão clínica.",
      links: [
        { name: "Editora", url: "https://www.springer.com/book/123456789" }
      ],
      project: "Mineração de Dados em Saúde"
    },
    {
      id: "p5",
      title: "Abordagem Híbrida para Sistemas de Recomendação com Feedback Implícito",
      authors: [
        { name: "Ana Pereira", orcidId: "0000-0001-5678-9012" },
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" }
      ],
      year: 2020,
      type: "Conference Paper",
      source: "International Conference on Recommender Systems",
      identifier: { type: "DOI", value: "10.1145/3340631.3394845" },
      abstract: "Proposta de uma abordagem híbrida para sistemas de recomendação que utiliza dados de feedback implícito do usuário.",
      links: [
        { name: "Versão publicada", url: "https://doi.org/10.1145/3340631.3394845" },
        { name: "Slides da apresentação", url: "https://slideshare.net/example" }
      ],
      project: "NLP para Língua Portuguesa"
    },
    {
      id: "p6",
      title: "Privacidade em Sistemas de Aprendizado Federado: Desafios e Soluções",
      authors: [
        { name: "Maria Oliveira Silva", orcidId: "0000-0002-1234-5678" }
      ],
      year: 2019,
      type: "Journal Article",
      source: "Journal of Privacy and Security",
      identifier: { type: "DOI", value: "10.1145/3312345.3456789" },
      abstract: "Análise dos principais desafios de privacidade em sistemas de aprendizado federado e propostas de soluções baseadas em criptografia homomórfica.",
      links: [
        { name: "Versão publicada", url: "https://doi.org/10.1145/3312345.3456789" },
        { name: "Preprint", url: "https://arxiv.org/abs/2019.12345" }
      ],
      project: "IA para Segurança Financeira"
    }
  ],
  projects: [
    {
      id: "p1",
      name: "NLP para Língua Portuguesa",
      description: "Desenvolvimento de modelos e recursos para processamento de linguagem natural específicos para o português brasileiro.",
      startYear: 2020,
      endYear: 2023,
      funding: "FAPESP - Processo 2020/12345-6"
    },
    {
      id: "p2",
      name: "IA para Segurança Financeira",
      description: "Aplicação de técnicas de inteligência artificial para detecção de fraudes e análise de riscos em sistemas financeiros.",
      startYear: 2019,
      endYear: null,
      funding: "CNPq - Processo 123456/2019-7"
    },
    {
      id: "p3",
      name: "Redes IoT Sustentáveis",
      description: "Pesquisa sobre algoritmos e protocolos para redes IoT com foco em eficiência energética e sustentabilidade.",
      startYear: 2021,
      endYear: 2022,
      funding: "Empresa parceira - Projeto de cooperação universidade-empresa"
    },
    {
      id: "p4",
      name: "Mineração de Dados em Saúde",
      description: "Aplicação de técnicas de mineração de dados e aprendizado de máquina para análise de dados de saúde e apoio à decisão clínica.",
      startYear: 2018,
      endYear: 2021,
      funding: "CAPES - Programa PROCAD"
    }
  ]
};

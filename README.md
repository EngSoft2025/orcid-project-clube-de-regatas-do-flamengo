# Trabalho ORCID

Documentação para a realização do Trabalho da Disciplina SCC0130 - Engenharia de Software, ministrada pelo Prof. Dr. Seiji Isotani.

## 1. Requisitos Básicos

### 1.1. Grupos

O trabalho deverá ser feito em grupos de até 5 alunos. Os alunos de um mesmo grupo devem ser, preferencialmente, da mesma turma (horário).

### 1.2. Entrega

A data de entrega final é dia DD/MM.

### 1.3. Plágio

O uso de IA (ex: Chat GPT) para produção de código é incentivada, mas plágio não será tolerado.

## 2. Requisitos Técnicos

### 2.1. Contextualização

O [ORCID](https://orcid.org) (Open Researcher and Contributor ID) é um identificador digital único para pesquisadores e autores acadêmicos. Ele foi criado como um projeto open source, com o objetivo de resolver o problema de ambiguidade nos nomes dos autores em publicações científicas, garantindo que cada pesquisador tenha um ID exclusivo, independente de variações no nome, afiliações institucionais ou mudanças de carreira.

### 2.2. Motivação

Embora o seja ORCID essencial para pesquisadores e acadêmicos, sua a interface e a usabilidade poderiam ser muito melhores. Além disso, é possível criar uma vasta gama de produtos e soluções em cima dele, tendo em vista que a [documentação](https://github.com/ORCID/ORCID-Source) da sua API é muito bem estruturada. Veja [como usar a API](/API.md).

### 2.3. Objetivos

**Entrevistar 3 professores** para coletar e documentar requisitos e necessidades para o desenvolvimento de um produto que melhore a visualização, interação ou gestão dos dados fornecidos via API pública do ORCID; seguindo os padrões, os métodos, e as documentações discutidas na disciplina. 

**Idealizar e desenvolver o produto**, que pode ser uma aplicação Web, Mobile, Desktop, etc.

### 2.4 Sugestões

Seguem algumas sugestões de possíveis melhorias:

- Visualizar estatísticas das publicações.
- Gerenciar publicações de forma mais visual e interativa.
- Analisar rede acadêmica de colaborações.
- Alertas e notificações (ex: citação de artigos, publicações).

## 3. Avaliação

A nota de avaliação do trabalho será dada por:

1. Documentação do Projeto (4):
    - Plano do projeto. (0,5)
    - Documento de requisitos e entrevistas. (2)
    - Modelagem do software. (0,5)
    - Casos de uso. (0,5)
    - Casos de teste. (0,5)

2. Desenvolvimento (3):
    - Seguir metodologia escolhida. (2)
    - Organização das tarefas. (1)

3. Produto (3):
    - Atendimento às funcionalidades e requisitos. (1)
    - Organização e documentação do código no GitHub. (0,5)
    - Usabilidade e manutenabilidade. (0,5)
    - Apresentação do produto. (1)
  
## Como adicionar as variáveis ao sistema
1. No diretório raiz, crie um arquivo .env e adicione
```
VITE_ORCID_REDIRECT_URL="[URL_DO_NGROK}/login/callback"  
```
Isso permite que o site seja acessado remotamente.

2. No diretório servidor/app, crcrie um arquivo .env e adicione
```
# Server configuration
PORT=3000 
NODE_ENV=production
DB_HOST=[NOME_DO_HOST_DA_BD]
DB_PORT=[PORTA_DA_DB]
DB_USER=[USUARIO_DA_BD]
DB_PASSWORD=[SENHA_DA_BD~]
DB_NAME=[NOME_DA_BD]

# ORCID API Configuration (optional - can be passed from frontend)
ORCID_CLIENT_ID=APP-GVPBMVHOEBR3RKKI
ORCID_CLIENT_SECRET=627be347-8fb5-4f90-976b-d18ecdbf6eb4

# ORCID URLs
ORCID_API_BASE_URL=https://pub.sandbox.orcid.org/v3.0
ORCID_TOKEN_URL=https://sandbox.orcid.org/oauth/token

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://172.24.59.101:8080
```

## Como realizar os testes unitários
1. Vá até o diretório servidor/app
```
cd servidor/app
```

2. Rode o comando
```
npm test server.test.js
```

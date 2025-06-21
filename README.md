# ORCID++ 
Projeto desenvolvido como trabalho da Disciplina SCC0130 - Engenharia de Software, ministrada pelo Prof. Dr. Seiji Isotani.

Consiste em um website cuja proposta é a utilização da API do ORCID para melhorar alguns aspectos da plataforma e adicionar novas features.

O projeto foi desenvolvido pelos alunos Maicon Chaves, Karl Antenhofen e Rodrigo Lima.

# Instalando o projeto

- Tutorial em vídeo (sem áudio): https://drive.google.com/drive/u/0/folders/19mPU2FWb8A6NGkguvRUObAKiln0zITuS

## 1. Requerimentos
1. Node.js (https://nodejs.org/pt)
2. ngrok (https://ngrok.com/)
3. PostgreSQL (https://www.postgresql.org/)

## 2. Clonar repositório e instalar bibliotecas
```
git clone https://github.com/EngSoft2025/orcid-project-clube-de-regatas-do-flamengo
cd orcid-project-clube-de-regatas-do-flamengo
```
- Instalando bibliotecas do frontend
```
cd ORCID++
npm i
```
- Instalando bibliotecas do backend
```
cd servidor/app
npm i
cd ./../..
```

## 3. Inicializar frontend
```
npm run dev
```
Algumas URLs irão aparecer. A que se refere ao website é qualquer uma que não seja localhost.

## 4. Inicializar ngrok
Em um novo terminal, digite:
```
ngrok http [PORTA DA URL]
```
[PORTA DA URL] é a porta do website, sendo obtida a partir da URL do passo 3.

## 5. Inicializar base de dados
Com o postgreSQL, crie uma nova base de dados utilizando as configurações que desejar, e inicialize-a com o comando SQL em BD/create_tables.sql.

## 6. Adicionando variáveis 
- No diretório raiz, crie um arquivo .env e escreva no arquivo
```
VITE_ORCID_REDIRECT_URL="[URL_DO_NGROK]/login/callback"  
```
[URL_DO_NGROK] é obtida ao rodar o comando do passo 4.

- No diretório servidor/app, crie um arquivo .env e escreva no arquivo
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
As variáveis sobre a base de dados devem ser preenchidas de acordo com as configurações impostas na etapa 5.

## 7. Inicializar backend
Em um novo terminal, abra o diretório do projeto e digite
```
cd ORCID++/servidor/app
node server.js
```
## 8. Configurando a API do ORCID
Com um perfil com acesso às ferramentas de desenvolvedor do ORCID, vá em https://orcid.org/ > Sign In/Register > Realize login > Clique no nome do seu perfil > Developer tools.

No campo "Redirect URIs", adicione uma linha:
```
[URL_DO_NGROK]/login/callback
```
[URL_DO_NGROK] é obtida ao rodar o comando do passo 4. 

Após adicionar o link, salve as alterações.

## 9. Rodando o website
Agora você deve ter 3 terminais abertos: um com o frontend, outro com o backend e o último com o ngrok. Com isso, basta abrir no navegador:

[URL_DO_NGROK]

E o site estará em funcionamento.

# NOTAS
## 1. Detalhes do projeto

O projeto foi desenvolvido inteiramente em modelo cascata, dividido em 4 fases:
### 1.1. Análise e definição de requisitos
Feito a partir de entrevistas com professores da Universidade de São Paulo (nossos stakeholders). Diagrama de casos de uso desenvolvido nesta etapa estão no diretório ./PlantUML, e documentos escritos estão no diretório ./Documentação.
### 1.2. Projeto de sistema e software
Feito majoritariamente com diagramas UML, desenvolvidos a partir da ferramenta PlantUML. Foram desenvolvidos diagramas de classes, atividades e sequência. Cada diagrama, e seu código correspondente, está no diretório ./PlantUML. O documento referente a esta estapa está em ./Documentação/ORCID++ - Projeto de Sistema e Software.pdf.
### 1.3. Implementação
A partir do que foi projetado, foi criado um website, com frontend e backend em javascript. A implementação está no diretório ./ORCID++
### 1.4. Testes
Os testes foram realizados de duas maneiras: manual e automatizado. Os testes automatizados foram feitos com a ferramenta Jest. Mais detalhes sobre os testes automatizados estão na subseção 2.

## Como realizar os testes unitários
1. Vá até o diretório servidor/app
```
cd ORCID++/servidor/app
```

2. Rode o comando
```
npm test server.test.js
```

Os testes devem retornar todos positivos. O foco nos testes automáticos é verificar a utilização da base de dados pelo backend. Ademais, os testes utilizam uma base de dados temporária para seus testes, e portanto não afetam os dados contidos no servidor.


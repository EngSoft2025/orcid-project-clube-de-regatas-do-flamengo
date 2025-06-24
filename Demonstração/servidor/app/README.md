# ORCID Proxy Server

Este é um servidor proxy para resolver problemas de CORS ao fazer chamadas para a API do ORCID diretamente do frontend.

## 🚀 Deploy no Glitch.com

1. Vá para [glitch.com](https://glitch.com) e clique em "New Project"
2. Escolha "Import from GitHub" ou "hello-node"
3. Substitua os arquivos pelos arquivos deste projeto
4. O Glitch irá automaticamente instalar as dependências e iniciar o servidor

## 📋 Arquivos Necessários

- `package.json` - Dependências e configurações do projeto
- `server.js` - Servidor principal com todas as rotas
- `.env` - Variáveis de ambiente (opcional)
- `README.md` - Esta documentação

## 🔧 Configuração

### Variáveis de Ambiente (Opcional)

Você pode configurar as seguintes variáveis no painel do Glitch ou no arquivo `.env`:

```bash
PORT=3000
NODE_ENV=production
ORCID_CLIENT_ID=seu_client_id
ORCID_CLIENT_SECRET=seu_client_secret
```

## 📡 Endpoints Disponíveis

### 1. Obter Token de Acesso
```http
POST /api/orcid/token
Content-Type: application/json

{
  "client_id": "APP-GVPBMVHOEBR3RKKI",
  "client_secret": "627be347-8fb5-4f90-976b-d18ecdbf6eb4",
  "grant_type": "client_credentials",
  "scope": "/read-public"
}
```

### 2. Obter Perfil Completo
```http
GET /api/orcid/profile/0000-0000-0000-0000
Authorization: Bearer {access_token}
```

### 3. Obter Seção Específica do Perfil
```http
GET /api/orcid/profile/0000-0000-0000-0000/works
Authorization: Bearer {access_token}
```

Seções disponíveis: `works`, `employments`, `educations`, `fundings`, `peer-reviews`, `person`

### 4. Buscar Perfis
```http
GET /api/orcid/search?q=nome+do+pesquisador&start=0&rows=10
Authorization: Bearer {access_token}
```

### 5. Health Check
```http
GET /health
```

## 🔄 Como Usar no Frontend

Depois de fazer o deploy no Glitch, substitua suas chamadas diretas para o ORCID API:

### Antes (com erro de CORS):
```javascript
const response = await fetch('https://sandbox.orcid.org/oauth/token', {
  method: 'POST',
  // ... resto da configuração
});
```

### Depois (usando o proxy):
```javascript
const response = await fetch('https://seu-projeto.glitch.me/api/orcid/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    client_id: 'APP-GVPBMVHOEBR3RKKI',
    client_secret: '627be347-8fb5-4f90-976b-d18ecdbf6eb4',
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'http://172.24.59.101:8080/login/callback'
  })
});
```

## 🛡️ Segurança

- O servidor inclui validação de parâmetros
- Tratamento de erros adequado
- Headers CORS configurados
- Validação de formato ORCID ID

## 🐛 Troubleshooting

### Erro 404
Verifique se a URL está correta e se o endpoint existe.

### Erro 401
Verifique se o token de autorização está sendo enviado corretamente no header.

### Erro 400
Verifique se os parâmetros obrigatórios estão sendo enviados.

### Erro 500
Verifique os logs do servidor no painel do Glitch para mais detalhes.

## 📝 Logs

Para ver os logs no Glitch:
1. Vá para o painel do seu projeto
2. Clique em "Tools" no canto inferior esquerdo
3. Selecione "Logs"

## 🔗 URLs de Exemplo

Após o deploy, sua URL base será algo como:
- `https://seu-projeto-name.glitch.me`

Substitua nas suas chamadas de API do frontend.
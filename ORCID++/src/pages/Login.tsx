import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogIn, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
  const handleOrcidLogin = () => {
    // ORCID OAuth parameters
    const clientId = 'APP-7ZEPLIK1RF37GXE9';
    const redirectUri = encodeURIComponent('https://09ff-45-161-243-216.ngrok-free.app/login/callback');
    const scope = encodeURIComponent('/authenticate');
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15); // Generate random state for security
    
    // Store state in sessionStorage for validation in callback
    sessionStorage.setItem('orcid_oauth_state', state);
    
    // Construct ORCID OAuth URL
    const orcidAuthUrl = `https://orcid.org/oauth/authorize?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
    
    // Redirect to ORCID OAuth
    window.location.href = orcidAuthUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 text-white p-3 rounded-full">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-8a1 1 0 0 0 2 0V7a1 1 0 0 0-2 0v5zm1-8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-blue-800 mb-2">ORCID++</h1>
          <p className="text-gray-600">Entre com sua conta ORCID</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">Fazer Login</CardTitle>
            <CardDescription className="text-center">
              Acesse sua conta usando seu ORCID iD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button 
                onClick={handleOrcidLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                size="lg"
              >
                <div className="flex items-center justify-center">
                  <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zM7.5 4.5c.83 0 1.5.67 1.5 1.5S8.33 7.5 7.5 7.5 6 6.83 6 6S6.67 4.5 7.5 4.5zm0 15c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm9-15h-3v3h-1.5V4.5h-3V3h3V0H15v3h3v1.5z"/>
                  </svg>
                  Entrar com ORCID iD
                  <ExternalLink className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p className="mb-4">
                Use seu ORCID iD para acessar de forma segura sua conta de pesquisador
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">O que é ORCID?</h4>
                <p className="text-blue-700 text-xs leading-relaxed">
                  ORCID é um identificador único e persistente para pesquisadores. 
                  Conecta você com suas atividades de pesquisa e garante que seu trabalho seja devidamente creditado.
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Não tem um ORCID iD?{' '}
                <Link to="/register" className="text-blue-600 hover:underline font-medium">
                  Criar conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            Ao continuar, você concorda com nossos{' '}
            <Link to="/terms" className="underline hover:text-gray-700">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link to="/privacy" className="underline hover:text-gray-700">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

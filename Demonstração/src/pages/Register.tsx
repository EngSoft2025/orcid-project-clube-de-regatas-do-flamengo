
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserPlus, ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Register = () => {
  const handleCreateOrcid = () => {
    // Redirecionar para criação de conta ORCID
    window.open('https://orcid.org/register', '_blank');
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
          <p className="text-gray-600">Crie ou conecte seu ORCID iD</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              Use seu ORCID iD para se conectar à plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button 
                onClick={handleCreateOrcid}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                size="lg"
              >
                <div className="flex items-center justify-center">
                  <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zM7.5 4.5c.83 0 1.5.67 1.5 1.5S8.33 7.5 7.5 7.5 6 6.83 6 6S6.67 4.5 7.5 4.5zm0 15c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm9-15h-3v3h-1.5V4.5h-3V3h3V0H15v3h3v1.5z"/>
                  </svg>
                  Criar ORCID iD
                  <ExternalLink className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                Benefícios do ORCID iD
              </h4>
              <ul className="text-green-700 text-sm space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Identificador único e permanente para pesquisadores</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Conecta automaticamente suas publicações e projetos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Reconhecido internacionalmente por editoras e agências</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Simplifica submissões de manuscritos e propostas</span>
                </li>
              </ul>
            </div>

            <div className="text-center text-sm text-gray-600">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Como funciona?</h4>
                <p className="text-blue-700 text-xs leading-relaxed">
                  1. Clique em "Criar ORCID iD" para ser redirecionado ao site oficial<br />
                  2. Preencha seus dados e crie sua conta gratuita<br />
                  3. Retorne e faça login com seu novo ORCID iD
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Já tem um ORCID iD?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            Ao criar uma conta ORCID, você concorda com os{' '}
            <a href="https://orcid.org/content/orcid-terms-use" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
              Termos de Uso do ORCID
            </a>{' '}
            e nossa{' '}
            <Link to="/privacy" className="underline hover:text-gray-700">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

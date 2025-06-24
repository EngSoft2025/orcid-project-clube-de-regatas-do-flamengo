import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Search, Users, BookOpen, Briefcase } from 'lucide-react';

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-blue-800 mb-4">ORCID++</h1>
        <p className="text-gray-600 text-lg mb-6">
          Conectando pesquisadores, compartilhando conhecimento científico
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Buscar Pesquisadores
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <Link to="/publications">
              <BookOpen className="mr-2 h-4 w-4" />
              Ver Publicações
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 bg-white border-blue-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Conecte-se</h3>
            <p className="text-gray-600 mb-4">
              Encontre pesquisadores com interesses similares e estabeleça novas colaborações acadêmicas.
            </p>
            <Button asChild variant="link" className="text-blue-600">
              <Link to="/search">Explorar Pesquisadores</Link>
            </Button>
          </div>
        </Card>
        
        <Card className="p-6 bg-white border-blue-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Publicações</h3>
            <p className="text-gray-600 mb-4">
              Descubra as mais recentes pesquisas e publicações científicas da comunidade acadêmica.
            </p>
            <Button asChild variant="link" className="text-blue-600">
              <Link to="/publications">Ver Publicações</Link>
            </Button>
          </div>
        </Card>
        
        <Card className="p-6 bg-white border-blue-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Projetos</h3>
            <p className="text-gray-600 mb-4">
              Conheça os projetos de pesquisa em andamento e oportunidades de colaboração.
            </p>
            <Button asChild variant="link" className="text-blue-600">
              <Link to="/projects">Explorar Projetos</Link>
            </Button>
          </div>
        </Card>
      </div>
      
      <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
        <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center">Benefícios do ORCID++</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Para Pesquisadores</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Aumente a visibilidade do seu trabalho acadêmico</li>
              <li>Encontre colaboradores para novos projetos</li>
              <li>Gerencie suas publicações e projetos em um só lugar</li>
              <li>Conecte-se com a comunidade científica global</li>
            </ul>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Para Instituições</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Promova as pesquisas da sua instituição</li>
              <li>Descubra talentos e especialistas</li>
              <li>Acompanhe a produção científica dos seus pesquisadores</li>
              <li>Estabeleça parcerias interinstitucionais</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Home;

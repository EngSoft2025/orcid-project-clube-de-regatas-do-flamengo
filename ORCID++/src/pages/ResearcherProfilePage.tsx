import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Researcher } from '../types';
import ResearcherProfile from '../components/ResearcherProfile';
import OtherResearcherPublications from '../components/OtherResearcherPublications';
import OtherResearcherProjects from '../components/OtherResearcherProjects';
import { toast } from '@/components/ui/use-toast';

// Props que esta página recebe do App
interface ResearcherProfilePageProps {
  getResearcherById: (id: string) => Researcher | null;
  loadResearcherData: (id: string, callback: (researcher: Researcher | null) => void) => void;
  loading: boolean;
}

const ResearcherProfilePage = ({ getResearcherById, loadResearcherData, loading }: ResearcherProfilePageProps) => {
  // Pega o ID da URL
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados locais desta página
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Efeito que roda quando o componente carrega ou o ID muda
  // Removemos loadResearcherData das dependências para evitar loop infinito
  useEffect(() => {
    if (!id) return;

    // Marca que está carregando e carrega os dados
    loadResearcherData(id, (loadedResearcher) => {
      if (loadedResearcher) {
        setResearcher(loadedResearcher);
        setIsCurrentUser(id === 'current');
      } else {
        setResearcher(null);
        // Mostra mensagem de erro
        toast({
          title: "Pesquisador não encontrado",
          description: "Não foi possível encontrar um pesquisador com o ID fornecido.",
          variant: "destructive"
        });
      }
    });
  }, [id]); // Apenas 'id' como dependência para evitar loop infinito

  // Tela de carregamento
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Carregando perfil do pesquisador...</p>
        </div>
      </div>
    );
  }

  // Tela de erro quando pesquisador não é encontrado
  if (!researcher) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Pesquisador não encontrado</h2>
            <p className="mb-6">Não foi possível encontrar um pesquisador com o ID fornecido.</p>
            <Button onClick={() => navigate('/search')}>Voltar para Busca</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Se for o usuário atual (perfil próprio)
  if (isCurrentUser) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6">
        {/* Botão voltar */}
        <div className="container mx-auto px-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Voltar
          </Button>
        </div>
        
        {/* Perfil editável */}
        <ResearcherProfile researcher={researcher} isEditable={true} />
      </div>
    );
  }

  // Para outros pesquisadores (não editável, com tabs)
  return (
    <div className="min-h-screen bg-gray-50 pt-6">
      {/* Botão voltar */}
      <div className="container mx-auto px-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>

      <div className="container mx-auto px-4">
        {/* Tabs para navegar entre seções */}
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="mb-6 bg-blue-50 border border-blue-100">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="publicacoes">Publicações</TabsTrigger>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
          </TabsList>
          
          {/* Conteúdo de cada tab */}
          <TabsContent value="perfil" className="mt-0">
            <ResearcherProfile researcher={researcher} isEditable={false} />
          </TabsContent>
          
          <TabsContent value="publicacoes" className="mt-0">
            <OtherResearcherPublications publications={researcher.publications} />
          </TabsContent>
          
          <TabsContent value="projetos" className="mt-0">
            <OtherResearcherProjects 
              projects={researcher.projects} 
              publications={researcher.publications} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResearcherProfilePage;

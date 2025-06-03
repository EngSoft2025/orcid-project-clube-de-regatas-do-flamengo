
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Pencil, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';

interface ProfileViewWrapperProps {
  isEditable: boolean;
  children: React.ReactNode;
  researcherId: string;
}

const ProfileViewWrapper = ({ isEditable, children, researcherId }: ProfileViewWrapperProps) => {
  const navigate = useNavigate();
  
  const handleEditClick = () => {
    navigate('/edit-profile');
  };
  
  return (
    <div className="relative">
      {isEditable && (
        <div className="absolute right-4 top-4 z-10">
          <Button 
            onClick={handleEditClick} 
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Pencil size={16} /> Editar Perfil
          </Button>
        </div>
      )}
      
      {!isEditable && (
        <div className="container mx-auto px-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">Perfil do Pesquisador</h2>
            <Link to="/search">
              <Button variant="outline" className="flex items-center gap-2">
                <Users size={16} /> Ver outros pesquisadores
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="profile" className="container mx-auto px-4">
        <TabsList className="mb-6 bg-blue-50 border border-blue-100">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="publications">Publicações</TabsTrigger>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-0">
          {children}
        </TabsContent>
        
        <TabsContent value="publications" className="mt-0">
          {isEditable ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-600 mb-4">Gerencie suas publicações na página específica</p>
              <Button
                onClick={() => navigate('/publications')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para Publicações
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <p className="text-gray-600">As publicações deste pesquisador estão disponíveis no perfil completo</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="projects" className="mt-0">
          {isEditable ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-600 mb-4">Gerencie seus projetos na página específica</p>
              <Button
                onClick={() => navigate('/projects')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para Projetos
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <p className="text-gray-600">Os projetos deste pesquisador estão disponíveis no perfil completo</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileViewWrapper;

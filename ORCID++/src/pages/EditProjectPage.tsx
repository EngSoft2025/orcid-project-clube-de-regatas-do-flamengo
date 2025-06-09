import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { Project } from '../types';
import { toast } from '@/hooks/use-toast';

interface EditProjectPageProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  isAuthenticated: boolean;
  token: string | null;
}

const EditProjectPage: React.FC<EditProjectPageProps> = ({
  projects,
  onUpdateProject,
  isAuthenticated,
  token
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega o projeto pelos dados já disponíveis
  useEffect(() => {
    if (!id) return;
    console.log(projects);
    
    const foundProject = projects.find(p => p.id === id);
    const meu_item = JSON.parse(JSON.stringify(foundProject));

    if (foundProject) {
      // Cria uma cópia para edição
      setProject(meu_item);
    }

    if (id && projects.length > 0 && !meu_item) {
      toast({
        title: "Projeto não encontrado",
        description: "O projeto solicitado não foi encontrado.",
        variant: "destructive"
      });
      navigate('/projects');
    }

  }, [id, projects]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    
    try {
      if (isAuthenticated && token) {
        /* TODO: Implementar salvamento via API do ORCID
         * 1. Mapear dados da interface Project para formato ORCID Funding
         * 2. Fazer PUT request para: https://api.orcid.org/v3.0/{orcid-id}/funding/{put-code}
         * 3. Headers: Authorization: Bearer {access-token}, Content-Type: application/json
         * 
         * Exemplo:
         * const fundingData = mapProjectToOrcidFunding(project);
         * 
         * const response = await fetch(`https://api.orcid.org/v3.0/${orcidId}/funding/${putCode}`, {
         *   method: 'PUT',
         *   headers: {
         *     'Authorization': `Bearer ${token}`,
         *     'Content-Type': 'application/json'
         *   },
         *   body: JSON.stringify(fundingData)
         * });
         * 
         * if (!response.ok) {
         *   throw new Error('Erro ao salvar projeto');
         * }
         */
        
        console.log('Salvando projeto via API do ORCID...', project);
      }
      
      // Atualiza o estado local através da função callback
      onUpdateProject(project);
      
      // Simula delay para feedback visual
      setTimeout(() => {
        toast({
          title: "Projeto salvo",
          description: "As alterações foram salvas com sucesso.",
        });
        setSaving(false);
        navigate('/projects');
      }, 500);
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  // Loading state enquanto não carregou o projeto
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <p>Carregando dados do projeto...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-blue-800">Editar Projeto</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label htmlFor="name">Nome do Projeto</Label>
            <Input 
              id="name" 
              name="name" 
              value={project.name} 
              onChange={handleChange} 
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startYear">Ano de Início</Label>
              <Input 
                id="startYear" 
                name="startYear" 
                type="number"
                value={project.startYear} 
                onChange={handleChange} 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endYear">Ano de Término</Label>
              <Input 
                id="endYear" 
                name="endYear" 
                value={project.endYear || ''} 
                onChange={handleChange} 
                className="mt-1"
                placeholder="Em andamento..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="funding">Financiamento</Label>
            <Input 
              id="funding" 
              name="funding" 
              value={project.funding || ''} 
              onChange={handleChange} 
              className="mt-1"
              placeholder="Ex: FAPESP, CNPq, etc."
            />
          </div>

          <div>
            <Label htmlFor="role">Seu Papel no Projeto</Label>
            <Input 
              id="role" 
              name="role" 
              value={project.role || ''} 
              onChange={handleChange} 
              className="mt-1"
              placeholder="Ex: Coordenador, Pesquisador, etc."
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={project.description} 
              onChange={handleChange} 
              rows={5}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              <Save size={18} /> 
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditProjectPage;
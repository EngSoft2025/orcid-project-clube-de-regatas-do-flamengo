
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { mockResearcherData } from '../data/mockData';
import { Project } from '../types';
import { toast } from '@/hooks/use-toast';

const EditProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      // In a real app, fetch from API using the ID
      // Here we're using mock data
      setTimeout(() => {
        const foundProject = mockResearcherData.projects.find(p => p.id === id);
        if (foundProject) {
          setProject(JSON.parse(JSON.stringify(foundProject)));
        }
        setLoading(false);
      }, 500);
    };

    fetchProject();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProject(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  const handleSave = () => {
    // In a real app, send to API
    toast({
      title: "Projeto salvo",
      description: "As alterações foram salvas com sucesso.",
    });
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Projeto não encontrado</h2>
            <Button onClick={() => navigate('/projects')}>Voltar para Projetos</Button>
          </div>
        </Card>
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
                value={project.endYear} 
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
            <Button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Save size={18} /> Salvar alterações
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EditProjectPage;

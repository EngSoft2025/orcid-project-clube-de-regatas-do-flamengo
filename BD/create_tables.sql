-- DROP das tabelas com base nas dependências
DROP TABLE IF EXISTS public.TrabalhosEProjetos CASCADE;
DROP TABLE IF EXISTS public.AutoresDeTrabalhos CASCADE;
DROP TABLE IF EXISTS public.Trabalhos CASCADE;
DROP TABLE IF EXISTS public.UsuariosEProjetos CASCADE;
DROP TABLE IF EXISTS public.Projetos CASCADE;
DROP TABLE IF EXISTS public.AreasDePesquisaEUsuarios CASCADE;
DROP TABLE IF EXISTS public.AreasDePesquisa CASCADE;
DROP TABLE IF EXISTS public.LinksExternos CASCADE;
DROP TABLE IF EXISTS public.Usuarios CASCADE;

CREATE TABLE public.Usuarios
(
	id SERIAL PRIMARY KEY,
	orcid_id varchar(19) UNIQUE NOT NULL CHECK (orcid_id ~ '^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$'),
	nome text,
	instituicao text,
	departamento text,
	cargo text,
	email text UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
	biografia text,
	pagina_institucional text,
	data_criacao timestamp DEFAULT CURRENT_TIMESTAMP,
	data_atualizacao timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_orcid ON public.Usuarios(orcid_id);

-- 🆕 NOVA TABELA: Links externos separados
CREATE TABLE public.LinksExternos
(
	id SERIAL PRIMARY KEY,
	usuario_id integer REFERENCES Usuarios(id) ON DELETE CASCADE,
	nome text NOT NULL,
	url text NOT NULL CHECK (url ~* '^https?://'),
	ordem integer NOT NULL DEFAULT 1,
	ativo boolean DEFAULT true,
	data_criacao timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_links_usuario ON public.LinksExternos(usuario_id);
CREATE INDEX idx_links_ordem ON public.LinksExternos(usuario_id, ordem);

CREATE TABLE public.AreasDePesquisa
(
	id SERIAL PRIMARY KEY,
	area text NOT NULL UNIQUE
);

CREATE TABLE public.AreasDePesquisaEUsuarios
(
	area_id integer REFERENCES AreasDePesquisa(id) ON DELETE CASCADE,
	usuario_id integer REFERENCES Usuarios(id) ON DELETE CASCADE,
	PRIMARY KEY (area_id, usuario_id)
);

CREATE INDEX idx_usuario_area_usuario ON public.AreasDePesquisaEUsuarios(usuario_id);
CREATE INDEX idx_usuario_area_area ON public.AreasDePesquisaEUsuarios(area_id);

CREATE TABLE public.Projetos
(
	id SERIAL PRIMARY KEY,
	nome text NOT NULL,
	ano_inicio integer NOT NULL,
	ano_termino integer,
	financiamento text,
	agencia_de_financiamento text,
	descricao text,
	funcao_no_projeto text
);

CREATE TABLE public.UsuariosEProjetos
(	
	usuario_id integer REFERENCES Usuarios(id) ON DELETE CASCADE,
	projeto_id integer REFERENCES Projetos(id) ON DELETE CASCADE,
	PRIMARY KEY (usuario_id, projeto_id)
);

CREATE TABLE public.Trabalhos
(
    id SERIAL PRIMARY KEY,
    nome text NOT NULL,
    ano integer NOT NULL,
    tipo_de_trabalho text NOT NULL,
    links_adicionais text[] CHECK (array_length(links_adicionais, 1) <= 5),
    tipo_identificador text,
    valor_identificador text,
    resumo text,
	fonte text,
	usuario_proprietario_id integer REFERENCES Usuarios(id) ON DELETE CASCADE -- Quem "possui" esta publicação no sistema
);

-- 🆕 NOVA ESTRUTURA: Tabela que armazena dados dos autores diretamente
CREATE TABLE public.AutoresDeTrabalhos
(	
	id SERIAL PRIMARY KEY,
	trabalho_id integer REFERENCES Trabalhos(id) ON DELETE CASCADE,
	nome_autor text NOT NULL, -- Nome do autor (sempre preenchido)
	orcid_autor varchar(19) CHECK (orcid_autor IS NULL OR orcid_autor ~ '^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$'), -- ORCID do autor (opcional)
	email_autor text CHECK (email_autor IS NULL OR email_autor ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), -- Email do autor (opcional)
	afiliacao_autor text, -- Instituição do autor (opcional)
	ordem_autor integer NOT NULL DEFAULT 1, -- Ordem do autor na publicação
	usuario_id integer REFERENCES Usuarios(id) ON DELETE SET NULL, -- Referência ao usuário SE ele estiver cadastrado no sistema
	data_criacao timestamp DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(trabalho_id, ordem_autor) -- Não pode ter dois autores na mesma posição
);

CREATE INDEX idx_autores_trabalho ON public.AutoresDeTrabalhos(trabalho_id);
CREATE INDEX idx_autores_orcid ON public.AutoresDeTrabalhos(orcid_autor);
CREATE INDEX idx_autores_usuario ON public.AutoresDeTrabalhos(usuario_id);
CREATE INDEX idx_autores_ordem ON public.AutoresDeTrabalhos(trabalho_id, ordem_autor);

-- Tabela de relacionamento tradicional mantida para compatibilidade com projetos
CREATE TABLE public.TrabalhosEProjetos
(
	trabalho_id integer REFERENCES Trabalhos(id) ON DELETE CASCADE,
	projeto_id integer REFERENCES Projetos(id) ON DELETE CASCADE,
	PRIMARY KEY (trabalho_id, projeto_id)
);

CREATE INDEX idx_trabalho_projeto_trabalho ON public.TrabalhosEProjetos(trabalho_id);
CREATE INDEX idx_trabalho_projeto_projeto ON public.TrabalhosEProjetos(projeto_id);

-- View para facilitar consultas de trabalhos com autores
CREATE VIEW vw_trabalhos_com_autores AS
SELECT 
    t.*,
    json_agg(
        json_build_object(
            'id', a.id,
            'nome', a.nome_autor,
            'orcid', a.orcid_autor,
            'email', a.email_autor,
            'afiliacao', a.afiliacao_autor,
            'ordem', a.ordem_autor,
            'usuario_cadastrado', CASE WHEN a.usuario_id IS NOT NULL THEN true ELSE false END
        ) ORDER BY a.ordem_autor
    ) as autores
FROM Trabalhos t
LEFT JOIN AutoresDeTrabalhos a ON t.id = a.trabalho_id
GROUP BY t.id;


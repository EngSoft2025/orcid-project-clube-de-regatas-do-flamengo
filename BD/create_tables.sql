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
	links_externos text[] CHECK (array_length(links_externos, 1) <= 5),
	pagina_institucional text
);

CREATE INDEX idx_usuarios_orcid ON public.Usuarios(orcid_id);


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
	fonte text
);


CREATE TABLE public.UsuariosETrabalhos
(	
	usuario_id integer REFERENCES Usuarios(id) ON DELETE CASCADE,
	trabalho_id integer REFERENCES Trabalhos(id) ON DELETE CASCADE,
	PRIMARY KEY (usuario_id, trabalho_id)
);

CREATE INDEX idx_usuario_trabalho_usuario ON public.UsuariosETrabalhos(usuario_id);
CREATE INDEX idx_usuario_trabalho_trabalho ON public.UsuariosETrabalhos(trabalho_id);


CREATE TABLE public.TrabalhosEProjetos
(
	trabalho_id integer REFERENCES Trabalhos(id) ON DELETE CASCADE,
	projeto_id integer REFERENCES Projetos(id) ON DELETE CASCADE,
	PRIMARY KEY (trabalho_id, projeto_id)
);

CREATE INDEX idx_trabalho_projeto_trabalho ON public.TrabalhosEProjetos(trabalho_id);
CREATE INDEX idx_trabalho_projeto_projeto ON public.TrabalhosEProjetos(projeto_id);



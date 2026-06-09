import React, { useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import Papa from 'papaparse';
import './css/DataBaseETN.css';

import navioCru from './assets/navio/navio-cru.png';
import navioFrente from './assets/navio/navio-frente.png';
import navioMeio from './assets/navio/navio-meio.png';
import navioCauda from './assets/navio/navio-cauda.png';
import navioTorre from './assets/navio/navio-torre.png';
import navioBotes from './assets/navio/navio-botes.png';
import navioCargaSuperior from './assets/navio/navio-carga-superior.png';
import navioCargaInferior from './assets/navio/navio-carga-inferior.png';

import portsUrl from './assets/Planilhas2/ports.csv?url';
import demandUrl from './assets/Planilhas2/Demand_WorldSmall.csv?url';
import distUrl from './assets/Planilhas2/dist_dense.csv?url';
import fleetUrl from './assets/Planilhas2/fleet_data.csv?url';
import distSparseUrl from './assets/Planilhas2/dist_sparse.csv?url';
import demandLargeUrl from './assets/Planilhas2/Demand_WorldLarge.csv?url';
import reportUrl from './assets/Planilhas2/part2_report.json?url';

Modal.setAppElement('#root');

const LINHAS_POR_PAGINA = 500;

const BASES_CSV = [
  { id: 'ports',        nome: 'ports.csv',              arquivo: portsUrl       },
  { id: 'demand',       nome: 'Demand_WorldSmall.csv',  arquivo: demandUrl      },
  { id: 'dist',         nome: 'dist_dense.csv',         arquivo: distUrl        },
  { id: 'fleet',        nome: 'fleet_data.csv',         arquivo: fleetUrl       },
  { id: 'dist_sparse',  nome: 'dist_sparse.csv',        arquivo: distSparseUrl  },
  { id: 'demand_large', nome: 'Demand_WorldLarge.csv',  arquivo: demandLargeUrl },
  { id: 'report',       nome: 'part2_report.json',      arquivo: reportUrl      },
];

function removerColunasVaziasFinais(rows = []) {
  if (!rows.length) return rows;
  let maxCols = rows.reduce((acc, row) => Math.max(acc, row?.length || 0), 0);
  const colunaVazia = (col) =>
    rows.every((row) => String(row?.[col] ?? '').trim() === '');
  while (maxCols > 0 && colunaVazia(maxCols - 1)) maxCols -= 1;
  return rows.map((row) => row.slice(0, maxCols));
}

function removerColunasHeaderVazio(rows = []) {
  if (!rows.length) return rows;
  const header = rows[0];
  const colsValidas = header.reduce((acc, h, i) => {
    if (String(h ?? '').trim() !== '') acc.push(i);
    return acc;
  }, []);
  if (colsValidas.length === header.length) return rows;
  return rows.map((row) => colsValidas.map((i) => row[i] ?? ''));
}


const PLANILHAS_ETN = [
  {
    id: 'frente',
    nome: 'ports.csv',
    parte: 'frente',
    tituloParte: 'Frente',
    objetivo:
      'Definir os nós do grafo e fornecer os custos portuários que compõem o peso das arestas',
    importancia:
      'Cumpre dois papéis simultaneamente — é a fonte dos metadados de cada porto (coordenadas, região, nome) e é a fonte de dois dos quatro componentes da fórmula de peso.',
    requisitos: [
      'Define os nós com identidade única via UNLocode',
      'Fornece PortCallCostFixed — custo fixo de escala, que pode ser negativo',
      'Fornece CostPerFULL — custo variável de movimentação de carga no porto de destino',
      'Fornece Longitude e Latitude para posicionamento geográfico na plotagem',
      'Fornece D_Region para coloração dos nós por corredor comercial',
    ],
    desc: 'Seção frontal do navio voltada para operação, aproximação e atracação.',
    img: navioFrente,
    preview: [
      ['Operação', 'Porto', 'Condição', 'Status', 'Observação'],
      ['Atracação frontal', 'Santos', 'Mar calmo', 'Concluído', 'Procedimento padrão aplicado'],
      ['Aproximação assistida', 'Rio Grande', 'Vento lateral', 'Concluído', 'Uso de apoio externo'],
      ['Correção de alinhamento', 'Suape', 'Corrente moderada', 'Monitorado', 'Ajuste de proa necessário'],
      ['Entrada em canal', 'Itajaí', 'Visibilidade média', 'Concluído', 'Sem desvios críticos'],
      ['Posicionamento final', 'Salvador', 'Condição estável', 'Concluído', 'Atracação segura'],
    ],
    detalhe: [
      ['Operação', 'Porto', 'Condição', 'Status', 'Observação'],
      ['Atracação frontal', 'Santos', 'Mar calmo', 'Concluído', 'Procedimento padrão aplicado'],
      ['Aproximação assistida', 'Rio Grande', 'Vento lateral', 'Concluído', 'Uso de apoio externo'],
      ['Correção de alinhamento', 'Suape', 'Corrente moderada', 'Monitorado', 'Ajuste de proa necessário'],
      ['Entrada em canal', 'Itajaí', 'Visibilidade média', 'Concluído', 'Sem desvios críticos'],
      ['Posicionamento final', 'Salvador', 'Condição estável', 'Concluído', 'Atracação segura'],
      ['Recuo controlado', 'Fortaleza', 'Ondulação leve', 'Planejado', 'Janela operacional em avaliação'],
      ['Reposicionamento de proa', 'Belém', 'Chuva fraca', 'Monitorado', 'Equipe em prontidão'],
    ],
    abas: {
      Operações: [
        ['Operação', 'Porto', 'Condição', 'Status'],
        ['Atracação frontal', 'Santos', 'Mar calmo', 'Concluído'],
        ['Entrada em canal', 'Itajaí', 'Visibilidade média', 'Concluído'],
        ['Correção de alinhamento', 'Suape', 'Corrente moderada', 'Monitorado'],
      ],
      Apoio: [
        ['Recurso', 'Porto', 'Uso', 'Resultado'],
        ['Rebocador', 'Rio Grande', 'Sim', 'Efetivo'],
        ['Sinalização auxiliar', 'Santos', 'Sim', 'Efetivo'],
        ['Monitoramento visual', 'Belém', 'Sim', 'Em curso'],
      ],
    },
  },
  {
    id: 'meio',
    nome: 'Demand_WorldSmall.csv',
    parte: 'meio',
    tituloParte: 'Meio',
    objetivo:
      'Definir as arestas do grafo — cada linha representa uma rota comercial real com demanda documentada entre dois portos.',
    importancia:
      'É o arquivo central do grafo. Sem ele não existem arestas, e portanto não existe grafo. Determina quais portos se conectam, com qual volume de carga e qual receita, sendo a base para o cálculo do peso econômico.',
    requisitos: [
      'Fornece a topologia do grafo (origem e destino de cada aresta)',
      'Fornece FFEPerWeek — volume real de carga por rota, usado no cálculo do peso',
      'Fornece Revenue_1 — receita por contêiner, que ao ser subtraída do custo gera pesos negativos naturais',
      'Permite que o grafo represente rotas comerciais reais em vez de vizinhança geográfica',
    ],
    desc: 'Parte central do navio, responsável por suporte operacional e equilíbrio estrutural.',
    img: navioMeio,
    preview: [
      ['Área', 'Indicador', 'Valor', 'Status', 'Comentário'],
      ['Centro de carga', 'Ocupação', '78%', 'Estável', 'Distribuição adequada'],
      ['Convés médio', 'Fluxo interno', 'Alto', 'Ativo', 'Operação intensa'],
      ['Compartimento central', 'Integridade', '100%', 'Seguro', 'Sem desvios'],
      ['Faixa estrutural', 'Tensão', 'Baixa', 'Normal', 'Condição prevista'],
      ['Corredor logístico', 'Uso', 'Moderado', 'Ativo', 'Sem gargalos'],
    ],
    detalhe: [
      ['Área', 'Indicador', 'Valor', 'Status', 'Comentário'],
      ['Centro de carga', 'Ocupação', '78%', 'Estável', 'Distribuição adequada'],
      ['Convés médio', 'Fluxo interno', 'Alto', 'Ativo', 'Operação intensa'],
      ['Compartimento central', 'Integridade', '100%', 'Seguro', 'Sem desvios'],
      ['Faixa estrutural', 'Tensão', 'Baixa', 'Normal', 'Condição prevista'],
      ['Corredor logístico', 'Uso', 'Moderado', 'Ativo', 'Sem gargalos'],
      ['Núcleo operacional', 'Acesso', 'Controlado', 'Seguro', 'Entrada supervisionada'],
      ['Área técnica', 'Rotina', 'Padronizada', 'Conforme', 'Checklist diário concluído'],
    ],
    abas: {
      Estrutura: [
        ['Segmento', 'Condição', 'Status'],
        ['Centro de carga', 'Estável', 'OK'],
        ['Convés médio', 'Operante', 'OK'],
        ['Faixa estrutural', 'Normal', 'OK'],
      ],
      Fluxo: [
        ['Trecho', 'Nível', 'Observação'],
        ['Corredor logístico', 'Moderado', 'Sem gargalos'],
        ['Acesso técnico', 'Baixo', 'Controlado'],
        ['Área central', 'Alto', 'Operação intensa'],
      ],
    },
  },
  {
    id: 'cauda',
    nome: 'dist_dense.csv',
    parte: 'cauda',
    tituloParte: 'Cauda',
    objetivo:
      'Fornecer a distância em milhas náuticas entre cada par de portos do WorldSmall para compor o componente de custo de navegação no peso.',
    importancia:
      'Resolve uma lacuna do Demand_WorldSmall — que define quais rotas existem mas não informa a distância entre os portos.',
    requisitos: [
      'Fornece a distância para todos os 1.764 pares do WorldSmall sem exceção',
    ],
    desc: 'Parte traseira do navio, ligada à propulsão e controle de saída.',
    img: navioCauda,
    preview: [
      ['Sistema', 'Leitura', 'Condição', 'Status', 'Observação'],
      ['Propulsor principal', 'Nominal', 'Estável', 'Ativo', 'Sem variação'],
      ['Saída assistida', 'Executada', 'Controlada', 'Concluído', 'Retirada segura'],
      ['Resposta traseira', 'Boa', 'Regular', 'Monitorado', 'Sem anomalias'],
      ['Eixo posterior', 'Normal', 'Estável', 'Ativo', 'Funcionamento pleno'],
      ['Controle de recuo', 'Preciso', 'Operante', 'Concluído', 'Boa aderência operacional'],
    ],
    detalhe: [
      ['Sistema', 'Leitura', 'Condição', 'Status', 'Observação'],
      ['Propulsor principal', 'Nominal', 'Estável', 'Ativo', 'Sem variação'],
      ['Saída assistida', 'Executada', 'Controlada', 'Concluído', 'Retirada segura'],
      ['Resposta traseira', 'Boa', 'Regular', 'Monitorado', 'Sem anomalias'],
      ['Eixo posterior', 'Normal', 'Estável', 'Ativo', 'Funcionamento pleno'],
      ['Controle de recuo', 'Preciso', 'Operante', 'Concluído', 'Boa aderência operacional'],
      ['Retorno reverso', 'Disponível', 'Pronto', 'Stand-by', 'Aguardando comando'],
      ['Setor traseiro', 'Integridade', '100%', 'Seguro', 'Sem intervenções'],
    ],
    abas: {
      Propulsão: [
        ['Elemento', 'Status', 'Observação'],
        ['Propulsor principal', 'Ativo', 'Sem variação'],
        ['Eixo posterior', 'Ativo', 'Funcionamento pleno'],
        ['Reverso', 'Stand-by', 'Disponível'],
      ],
      Saída: [
        ['Procedimento', 'Resultado', 'Status'],
        ['Saída assistida', 'Retirada segura', 'Concluído'],
        ['Controle de recuo', 'Boa aderência', 'Concluído'],
        ['Alinhamento posterior', 'Estável', 'Monitorado'],
      ],
    },
  },
  {
    id: 'torre',
    nome: 'fleet_data.csv',
    parte: 'torre',
    tituloParte: 'Torre',
    objetivo:
      'Fornecer os parâmetros do navio de referência para derivar o coeficiente de custo por milha náutica.',
    importancia:
      'Resolve a necessidade de um multiplicador de distância que venha inteiramente do dataset, sem suposições externas.',
    requisitos: [
      'Fornece TC rate daily (fixed Cost) — custo diário de afretamento do navio',
      'Fornece designSpeed — velocidade de projeto para converter custo diário em custo por milha',
    ],
    desc: 'Torre de comando e navegação da embarcação.',
    img: navioTorre,
    preview: [
      ['Painel', 'Leitura', 'Situação', 'Status', 'Comentário'],
      ['Radar', 'Nominal', 'Estável', 'Ativo', 'Cobertura adequada'],
      ['Comunicação', 'Plena', 'Operante', 'Ativo', 'Sem ruídos'],
      ['Navegação', 'Assistida', 'Segura', 'Ativo', 'Rota confirmada'],
      ['Monitoramento', 'Constante', 'Normal', 'Ativo', 'Sem alertas'],
      ['Comando central', 'Responsivo', 'Conforme', 'Ativo', 'Tomada de decisão regular'],
    ],
    detalhe: [
      ['Painel', 'Leitura', 'Situação', 'Status', 'Comentário'],
      ['Radar', 'Nominal', 'Estável', 'Ativo', 'Cobertura adequada'],
      ['Comunicação', 'Plena', 'Operante', 'Ativo', 'Sem ruídos'],
      ['Navegação', 'Assistida', 'Segura', 'Ativo', 'Rota confirmada'],
      ['Monitoramento', 'Constante', 'Normal', 'Ativo', 'Sem alertas'],
      ['Comando central', 'Responsivo', 'Conforme', 'Ativo', 'Tomada de decisão regular'],
      ['Visão externa', 'Boa', 'Confiável', 'Ativo', 'Leitura sem obstrução'],
      ['Controle tático', 'Alinhado', 'Conforme', 'Ativo', 'Protocolos mantidos'],
    ],
    abas: {
      Navegação: [
        ['Componente', 'Estado', 'Status'],
        ['Radar', 'Nominal', 'Ativo'],
        ['Navegação', 'Assistida', 'Ativo'],
        ['Visão externa', 'Boa', 'Ativo'],
      ],
      Comando: [
        ['Setor', 'Condição', 'Resultado'],
        ['Comando central', 'Responsivo', 'Conforme'],
        ['Comunicação', 'Plena', 'Operante'],
        ['Controle tático', 'Alinhado', 'Conforme'],
      ],
    },
  },
  {
    id: 'botes',
    nome: 'dist_sparse.csv',
    parte: 'botes',
    tituloParte: 'Botes',
    objetivo:
      'Definir as arestas do primeiro grafo construído no projeto, conectando portos vizinhos diretos na rede marítima global.',
    importancia:
      'Foi o ponto de partida da modelagem do grafo antes da migração para o WorldSmall. A diferença entre topologia de vizinhança e rotas comerciais reais foi o que motivou a transição para o Demand como fonte de arestas.',
    requisitos: [
      'Não houve.',
    ],
    desc: 'Botes salva-vidas, recursos auxiliares e itens de segurança.',
    img: navioBotes,
    preview: [
      ['Item', 'Quantidade', 'Condição', 'Status', 'Observação'],
      ['Botes salva-vidas', '8', 'Boa', 'Disponível', 'Prontos para uso'],
      ['Coletes', '180', 'Boa', 'Disponível', 'Inventário completo'],
      ['Kits de emergência', '12', 'Revisado', 'Ativo', 'Sem pendências'],
      ['Boias circulares', '24', 'Boa', 'Disponível', 'Distribuição correta'],
      ['Sinalizadores', '30', 'Controlado', 'Monitorado', 'Validade verificada'],
    ],
    detalhe: [
      ['Item', 'Quantidade', 'Condição', 'Status', 'Observação'],
      ['Botes salva-vidas', '8', 'Boa', 'Disponível', 'Prontos para uso'],
      ['Coletes', '180', 'Boa', 'Disponível', 'Inventário completo'],
      ['Kits de emergência', '12', 'Revisado', 'Ativo', 'Sem pendências'],
      ['Boias circulares', '24', 'Boa', 'Disponível', 'Distribuição correta'],
      ['Sinalizadores', '30', 'Controlado', 'Monitorado', 'Validade verificada'],
      ['Área de apoio', '3 setores', 'Regular', 'Inspecionado', 'Acesso liberado'],
      ['Pontos de evacuação', '6', 'Boa', 'Conforme', 'Sinalização correta'],
    ],
    abas: {
      Itens: [
        ['Item', 'Quantidade', 'Status'],
        ['Botes salva-vidas', '8', 'Disponível'],
        ['Coletes', '180', 'Disponível'],
        ['Boias circulares', '24', 'Disponível'],
      ],
      Inspeção: [
        ['Componente', 'Resultado', 'Observação'],
        ['Kits de emergência', 'Revisado', 'Sem pendências'],
        ['Sinalizadores', 'Monitorado', 'Validade verificada'],
        ['Evacuação', 'Conforme', 'Sinalização correta'],
      ],
    },
  },
  {
    id: 'cargaSuperior',
    nome: 'Demand_WorldLarge.csv',
    parte: 'cargaSuperior',
    tituloParte: 'Carga Superior',
    objetivo:
      'Definir as arestas do grafo — cada linha representa uma rota comercial real com demanda documentada entre dois portos.',
    importancia:
      'Tem a mesma importância do WorldSmall, porém é uma instância muito mais esparsa. O WorldSmall foi escolhido como a base do grafo em vez do WorldLarge por ser menos complexo e mais fácil de visualizar.',
    requisitos: [
      'Não houve.',
    ],
    desc: 'Área superior de carga da embarcação.',
    img: navioCargaSuperior,
    preview: [
      ['Bloco', 'Ocupação', 'Categoria', 'Status', 'Observação'],
      ['CS-01', '84%', 'Contêiner', 'Ativo', 'Distribuição regular'],
      ['CS-02', '72%', 'Carga seca', 'Ativo', 'Sem restrições'],
      ['CS-03', '91%', 'Contêiner', 'Monitorado', 'Alta ocupação'],
      ['CS-04', '68%', 'Misto', 'Ativo', 'Fluxo estável'],
      ['CS-05', '75%', 'Carga geral', 'Ativo', 'Operação normal'],
    ],
    detalhe: [
      ['Bloco', 'Ocupação', 'Categoria', 'Status', 'Observação'],
      ['CS-01', '84%', 'Contêiner', 'Ativo', 'Distribuição regular'],
      ['CS-02', '72%', 'Carga seca', 'Ativo', 'Sem restrições'],
      ['CS-03', '91%', 'Contêiner', 'Monitorado', 'Alta ocupação'],
      ['CS-04', '68%', 'Misto', 'Ativo', 'Fluxo estável'],
      ['CS-05', '75%', 'Carga geral', 'Ativo', 'Operação normal'],
      ['CS-06', '63%', 'Carga leve', 'Ativo', 'Área estabilizada'],
      ['CS-07', '88%', 'Contêiner', 'Monitorado', 'Exige acompanhamento'],
    ],
    abas: {
      Ocupação: [
        ['Bloco', 'Ocupação', 'Status'],
        ['CS-01', '84%', 'Ativo'],
        ['CS-03', '91%', 'Monitorado'],
        ['CS-05', '75%', 'Ativo'],
      ],
      Segurança: [
        ['Bloco', 'Condição', 'Resultado'],
        ['CS-02', 'Sem restrições', 'OK'],
        ['CS-04', 'Fluxo estável', 'OK'],
        ['CS-07', 'Acompanhamento', 'Atenção'],
      ],
    },
  },
  {
    id: 'cargaInferior',
    nome: 'part2_report.json',
    parte: 'cargaInferior',
    tituloParte: 'Carga Inferior',
    objetivo:
      'Evidenciar o resultado dos testes aplicados ao grafo ETN da parte 2 do projeto.',
    importancia:
      'Demonstra o desempnho, por meio de métricas (tempo de execução, memória e etc.) de cada algoritimo sob vários cenários de teste. Oferece os dados para serem realizados os insights de melhores casos de uso e limites de design, revelando como a estrutura do grafo pode influenciar o algoritimo.',
    requisitos: [
      'Casos de teste BFS/DFS a partir de 3 fontes distintas.',
      'Possui casos de teste em Bellman-Ford para: Subgrafo Positivo, Subgrafo Negativo e Grafo Completo (com cilos negativos).',
      'Casos de teste Dijkstra com 5 pares origem-destino.',
      'Mostra custos máximos de cada cenário de teste.',
      'Evidencia tempo de execução de cada cenário de teste.',
    ],
    desc: 'Área inferior de carga e armazenamento da embarcação.',
    img: navioCargaInferior,
    preview: [
      ['Porão', 'Peso', 'Categoria', 'Status', 'Observação'],
      ['CI-01', '120 t', 'Carga pesada', 'Ativo', 'Distribuição segura'],
      ['CI-02', '95 t', 'Carga geral', 'Ativo', 'Sem desvios'],
      ['CI-03', '140 t', 'Contêiner', 'Monitorado', 'Revisão de equilíbrio'],
      ['CI-04', '88 t', 'Carga seca', 'Ativo', 'Boa acomodação'],
      ['CI-05', '76 t', 'Misto', 'Ativo', 'Operação regular'],
    ],
    detalhe: [
      ['Porão', 'Peso', 'Categoria', 'Status', 'Observação'],
      ['CI-01', '120 t', 'Carga pesada', 'Ativo', 'Distribuição segura'],
      ['CI-02', '95 t', 'Carga geral', 'Ativo', 'Sem desvios'],
      ['CI-03', '140 t', 'Contêiner', 'Monitorado', 'Revisão de equilíbrio'],
      ['CI-04', '88 t', 'Carga seca', 'Ativo', 'Boa acomodação'],
      ['CI-05', '76 t', 'Misto', 'Ativo', 'Operação regular'],
      ['CI-06', '130 t', 'Carga pesada', 'Ativo', 'Base estável'],
      ['CI-07', '102 t', 'Carga geral', 'Monitorado', 'Reavaliação periódica'],
    ],
    abas: {
      Armazenamento: [
        ['Porão', 'Peso', 'Status'],
        ['CI-01', '120 t', 'Ativo'],
        ['CI-03', '140 t', 'Monitorado'],
        ['CI-06', '130 t', 'Ativo'],
      ],
      Estabilidade: [
        ['Porão', 'Condição', 'Observação'],
        ['CI-02', 'Sem desvios', 'Boa acomodação'],
        ['CI-04', 'Estável', 'Operação regular'],
        ['CI-07', 'Reavaliação', 'Acompanhamento'],
      ],
    },
  },
];

const PARTE_TO_INDEX_ETN = {
  frente: 0,
  meio: 1,
  cauda: 2,
  torre: 3,
  botes: 4,
  cargaSuperior: 5,
  cargaInferior: 6,
};

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.5 6L8.5 12L14.5 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.5 6L15.5 12L9.5 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DataBaseETN({ onBack }) {
  const [selecionada, setSelecionada] = useState(0);
  const [parteSelecionada, setParteSelecionada] = useState('base');
  const [modalAberto, setModalAberto] = useState(false);
  const [preview, setPreview] = useState([]);
  const [detalhe, setDetalhe] = useState([]);
  const [abas, setAbas] = useState([]);
  const [abaAtual, setAbaAtual] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [reqPage, setReqPage] = useState(0);

  const [csvSel, setCsvSel] = useState(0);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvDetalhe, setCsvDetalhe] = useState([]);
  const [csvCarregando, setCsvCarregando] = useState(false);
  const [csvErro, setCsvErro] = useState('');
  const [linhasVisiveis, setLinhasVisiveis] = useState(LINHAS_POR_PAGINA);

  const [csvIsJson, setCsvIsJson] = useState(false);
  const [csvJsonData, setCsvJsonData] = useState(null);
  const [jsonTabAtual, setJsonTabAtual] = useState('');

  const imagens = useMemo(
    () => ({
      base: { label: 'Navio completo', src: navioCru },
      frente: { label: 'Frente', src: navioFrente },
      meio: { label: 'Meio', src: navioMeio },
      cauda: { label: 'Cauda', src: navioCauda },
      torre: { label: 'Torre', src: navioTorre },
      botes: { label: 'Botes', src: navioBotes },
      cargaSuperior: { label: 'Carga Superior', src: navioCargaSuperior },
      cargaInferior: { label: 'Carga Inferior', src: navioCargaInferior },
    }),
    []
  );

  const imagemAtual = imagens[parteSelecionada] || imagens.base;
  const planilha = PLANILHAS_ETN[selecionada];
  const requisitos = planilha?.requisitos || [];
  const requisitoAtual = requisitos[reqPage] || '';

  const carregarCsv = async (idx) => {
    const base = BASES_CSV[idx];
    if (!base) return;

    setCsvSel(idx);
    setCsvCarregando(true);
    setCsvErro('');
    setCsvPreview([]);
    setCsvDetalhe([]);
    setCsvIsJson(false);
    setCsvJsonData(null);
    setJsonTabAtual('');

    try {
      const response = await fetch(base.arquivo, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar arquivo (${response.status})`);
      }

      const isJson = base.nome.endsWith('.json');

      if (isJson) {
        const data = await response.json();
        const sectionNames = Object.keys(data);

        const summaryRows = [['Seção'], ...sectionNames.map((name) => [name])];

        setCsvPreview(summaryRows);
        setCsvDetalhe([]);
        setCsvIsJson(true);
        setCsvJsonData(data);
        setJsonTabAtual(sectionNames[0] || '');
      } else {
        const texto = await response.text();
        const { data } = Papa.parse(texto, { skipEmptyLines: true });
        const rows = removerColunasHeaderVazio(removerColunasVaziasFinais(data));

        if (!rows.length) {
          throw new Error(`A base "${base.nome}" está vazia.`);
        }

        setCsvPreview(rows.slice(0, 6));
        setCsvDetalhe(rows);
      }
    } catch (e) {
      console.error('Erro ao carregar base CSV do ETN:', e);
      setCsvErro(`Não foi possível carregar a base "${base.nome}".`);
      setCsvPreview([]);
      setCsvDetalhe([]);
    } finally {
      setCsvCarregando(false);
    }
  };

  const carregarPlanilha = async (idx, abaDesejada = null) => {
    const item = PLANILHAS_ETN[idx];
    if (!item) return;

    setSelecionada(idx);
    setParteSelecionada(item.parte);
    setCarregando(true);
    setErro('');
    setPreview([]);
    setDetalhe([]);
    setAbas([]);
    setAbaAtual('');
    setReqPage(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 180));

      const nomesAbas = Object.keys(item.abas || {});
      const abaSelecionada =
        abaDesejada && nomesAbas.includes(abaDesejada)
          ? abaDesejada
          : nomesAbas[0] || '';

      const rowsAba = abaSelecionada ? item.abas[abaSelecionada] : [];

      setAbas(nomesAbas);
      setAbaAtual(abaSelecionada);
      setPreview(item.preview || []);
      setDetalhe(rowsAba.length ? rowsAba : item.detalhe || []);
    } catch (e) {
      console.error('Erro ao carregar base ETN:', e);
      setErro(`Não foi possível carregar a planilha "${item.nome}".`);
      setPreview([]);
      setDetalhe([]);
      setAbas([]);
      setAbaAtual('');
    } finally {
      setCarregando(false);
    }

    carregarCsv(idx);
  };

  const handleSelecionarParte = (parte) => {
    const idx = PARTE_TO_INDEX_ETN[parte];
    if (idx !== undefined) {
      carregarPlanilha(idx);
    } else {
      setParteSelecionada('base');
    }
  };

  const handleSelecionarCsv = (idx) => {
    carregarCsv(idx);
    setSelecionada(idx);
    setParteSelecionada(PLANILHAS_ETN[idx]?.parte || 'base');
    setReqPage(0);
  };

  const handleTrocarAba = (nomeAba) => {
    const item = PLANILHAS_ETN[selecionada];
    if (!item) return;

    setAbaAtual(nomeAba);
    setDetalhe(item.abas?.[nomeAba] || item.detalhe || []);
  };

  const handlePrevReq = () => {
    setReqPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNextReq = () => {
    setReqPage((prev) => Math.min(prev + 1, requisitos.length - 1));
  };

  const abrirModal = () => {
    setLinhasVisiveis(LINHAS_POR_PAGINA);
    setModalAberto(true);
  };

  const handleVerMais = () => {
    setLinhasVisiveis((prev) => prev + LINHAS_POR_PAGINA);
  };

  useEffect(() => {
    carregarPlanilha(0);
  }, []);

  const baseCsvAtual = BASES_CSV[csvSel];

  const headers = csvPreview.length > 0 ? csvPreview[0] : [];
  const bodyRows = csvPreview.length > 1 ? csvPreview.slice(1) : [];
  const detalheHeaders = csvDetalhe.length > 0 ? csvDetalhe[0] : [];
  const detalheRows = csvDetalhe.length > 1 ? csvDetalhe.slice(1) : [];
  const detalheRowsVisiveis = detalheRows.slice(0, linhasVisiveis);
  const totalRegistros = detalheRows.length;


  return (
    <div className="database-page database-etn-theme">
      <div className="database-shell">
        <div className="database-topbar">
          <button className="database-back-btn" onClick={onBack} type="button">
            <span className="database-back-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
              >
                <path
                  d="M15 6L9 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="database-back-text">Voltar</span>
          </button>
        </div>

        <header className="database-header">
          <h1 className="database-title">Estrutura do Navio</h1>
          <p className="database-desc">
            Navegue visualmente pela embarcação e associe cada componente a uma
            base operacional do projeto ETN. Ao clicar em uma área
            específica, a prévia dos dados é atualizada automaticamente.
          </p>
        </header>

        <div className="database-grid">
          <section className="database-card plane-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Navegação Interativa</p>
              </div>
            </div>

            <div className="plane-stage plane-stage-etn">
              <div className="plane-image-wrap ship-image-wrap">
                <img
                  src={imagemAtual.src}
                  alt={imagemAtual.label}
                  className="database-image database-etn-image"
                />

                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-frente"
                  onClick={() => handleSelecionarParte('frente')}
                  aria-label="Selecionar frente"
                  title="Frente"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-frente2"
                  onClick={() => handleSelecionarParte('frente')}
                  aria-label="Selecionar frente"
                  title="Frente"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-meio"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-meio2"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-meio3"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-meio4"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-cauda"
                  onClick={() => handleSelecionarParte('cauda')}
                  aria-label="Selecionar cauda"
                  title="Cauda"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-cauda2"
                  onClick={() => handleSelecionarParte('cauda')}
                  aria-label="Selecionar cauda"
                  title="Cauda"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-cauda3"
                  onClick={() => handleSelecionarParte('cauda')}
                  aria-label="Selecionar cauda"
                  title="Cauda"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-cauda4"
                  onClick={() => handleSelecionarParte('cauda')}
                  aria-label="Selecionar cauda"
                  title="Cauda"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-torre"
                  onClick={() => handleSelecionarParte('torre')}
                  aria-label="Selecionar torre"
                  title="Torre"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-torre2"
                  onClick={() => handleSelecionarParte('torre')}
                  aria-label="Selecionar torre"
                  title="Torre"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-torre3"
                  onClick={() => handleSelecionarParte('torre')}
                  aria-label="Selecionar torre"
                  title="Torre"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-botes"
                  onClick={() => handleSelecionarParte('botes')}
                  aria-label="Selecionar botes"
                  title="Botes"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-botes2"
                  onClick={() => handleSelecionarParte('botes')}
                  aria-label="Selecionar botes"
                  title="Botes"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-carga-superior"
                  onClick={() => handleSelecionarParte('cargaSuperior')}
                  aria-label="Selecionar carga superior"
                  title="Carga Superior"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-carga-superior2"
                  onClick={() => handleSelecionarParte('cargaSuperior')}
                  aria-label="Selecionar carga superior"
                  title="Carga Superior"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-carga-superior3"
                  onClick={() => handleSelecionarParte('cargaSuperior')}
                  aria-label="Selecionar carga superior"
                  title="Carga Superior"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-carga-inferior"
                  onClick={() => handleSelecionarParte('cargaInferior')}
                  aria-label="Selecionar carga inferior"
                  title="Carga Inferior"
                />
                <button
                  type="button"
                  className="plane-hotspot ship-hotspot hotspot-navio-carga-inferior2"
                  onClick={() => handleSelecionarParte('cargaInferior')}
                  aria-label="Selecionar carga inferior"
                  title="Carga Inferior"
                />
              </div>
            </div>
          </section>

          <section className="database-card top-info-card">
            <div className="card-head">
              <div>
                <h2>Informações da Base</h2>
              </div>
            </div>

            <div className="sheet-tabs etn-sheet-tabs">
              {PLANILHAS_ETN.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sheet-tab ${idx === selecionada ? 'active' : ''}`}
                  onClick={() => carregarPlanilha(idx)}
                >
                  {item.nome}
                </button>
              ))}
            </div>

            <div className="sheet-summary">
              <div className="summary-box">
                <span className="summary-label">Objetivo</span>
                <p className="summary-text">{planilha?.objetivo}</p>
              </div>

              <div className="summary-box">
                <span className="summary-label">Importância</span>
                <p className="summary-text">{planilha?.importancia}</p>
              </div>

              <div className="summary-box">
                <span className="summary-label">Requisitos Atendidos</span>
                <div className="requirement-carousel">
                  <div className="requirement-card">
                    <p className="requirement-text">{requisitoAtual}</p>
                  </div>

                  <div className="requirement-controls">
                    <button
                      type="button"
                      className="requirement-nav-btn"
                      onClick={handlePrevReq}
                      disabled={reqPage === 0}
                      aria-label="Requisito anterior"
                    >
                      <ChevronLeftIcon />
                    </button>

                    <span className="requirement-page">
                      {requisitos.length
                        ? `${reqPage + 1} / ${requisitos.length}`
                        : '0 / 0'}
                    </span>

                    <button
                      type="button"
                      className="requirement-nav-btn"
                      onClick={handleNextReq}
                      disabled={
                        reqPage === requisitos.length - 1 ||
                        requisitos.length === 0
                      }
                      aria-label="Próximo requisito"
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="database-card table-card">
            <div className="table-preview-title-wrap">
              <h2 className="table-preview-title">Prévia da Base</h2>
            </div>

            <div className="table-subtabs-wrap">
              <div className="table-subtabs-header">
                <span className="table-subtabs-label">Planilhas do ETN</span>
                <span className="table-subtabs-current">
                  {baseCsvAtual ? `Selecionada: ${baseCsvAtual.nome}` : ''}
                </span>
              </div>

              <div className="sheet-subtabs sheet-subtabs--table">
                {BASES_CSV.map((base, idx) => (
                  <button
                    key={base.id}
                    type="button"
                    className={`sheet-subtab ${csvSel === idx ? 'active' : ''}`}
                    onClick={() => handleSelecionarCsv(idx)}
                  >
                    {base.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="preview-wrapper">
              {csvCarregando ? (
                <div className="empty-state">
                  <div className="loader" />
                  <p>Carregando prévia da base...</p>
                </div>
              ) : csvErro ? (
                <div className="empty-state error">
                  <p>{csvErro}</p>
                </div>
              ) : csvPreview.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum dado disponível para visualização.</p>
                </div>
              ) : (
                <table className="preview-table preview-table--compact">
                  <thead>
                    <tr>
                      {headers.map((cell, index) => (
                        <th key={index} title={String(cell ?? '')}>
                          <div className="cell-limit header-cell-limit">
                            {String(cell ?? '')}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        onClick={csvIsJson ? () => { setJsonTabAtual(row[0]); abrirModal(); } : undefined}
                        style={csvIsJson ? { cursor: 'pointer' } : undefined}
                      >
                        {headers.map((_, colIndex) => (
                          <td key={colIndex} title={String(row[colIndex] ?? '')}>
                            <div className="cell-limit">
                              {String(row[colIndex] ?? '')}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="preview-footer">
              <span className="preview-note">
                {csvIsJson
                  ? `Arquivo JSON com ${csvJsonData ? Object.keys(csvJsonData).length : 0} seções — clique em uma seção para explorar.`
                  : `Exibindo uma amostra inicial da base selecionada${baseCsvAtual ? ` • ${baseCsvAtual.nome}` : ''}.`}
              </span>

              <button
                type="button"
                className="details-btn"
                onClick={abrirModal}
                disabled={!csvIsJson && csvDetalhe.length === 0}
              >
                Ver base completa
              </button>
            </div>
          </section>
        </div>

        <Modal
          isOpen={modalAberto}
          onRequestClose={() => setModalAberto(false)}
          className="database-modal database-modal-etn"
          overlayClassName="database-modal-overlay database-modal-overlay-etn"
          contentLabel="Detalhes da base"
        >
          <div className="modal-header">
            <div>
              <p className="eyebrow">Visualização completa</p>
              <h2>{baseCsvAtual?.nome}</h2>
              <p className="modal-subtitle">
                {csvIsJson
                  ? `${csvJsonData ? Object.keys(csvJsonData).length : 0} seções de algoritmos`
                  : `${totalRegistros.toLocaleString('pt-BR')} registros na base.`}
              </p>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setModalAberto(false)}
            >
              ×
            </button>
          </div>

          {csvIsJson && csvJsonData && (
            <div className="modal-abas">
              {Object.keys(csvJsonData).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`modal-aba-btn ${jsonTabAtual === name ? 'active' : ''}`}
                  onClick={() => setJsonTabAtual(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="modal-table-wrapper">
            {csvIsJson ? (
              jsonTabAtual && csvJsonData?.[jsonTabAtual] ? (
                <pre className="json-raw-block">
                  {JSON.stringify(csvJsonData[jsonTabAtual], null, 2)}
                </pre>
              ) : (
                <div className="empty-state">
                  <p>Sem dados para exibir nesta seção.</p>
                </div>
              )
            ) : csvDetalhe.length > 0 ? (
              <table className="modal-table">
                <thead>
                  <tr>
                    {detalheHeaders.map((cell, index) => (
                      <th key={index} title={String(cell ?? '')}>
                        <div className="cell-limit modal-header-limit">
                          {String(cell ?? '')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalheRowsVisiveis.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {detalheHeaders.map((_, colIndex) => (
                        <td key={colIndex} title={String(row[colIndex] ?? '')}>
                          <div className="cell-limit modal-cell-limit">
                            {String(row[colIndex] ?? '')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>Sem dados para exibir.</p>
              </div>
            )}
          </div>

          {!csvIsJson && detalheRows.length > 0 && (
            <div className="modal-footer">
              <span className="modal-footer-note">
                Mostrando {Math.min(linhasVisiveis, totalRegistros).toLocaleString('pt-BR')}{' '}
                de {totalRegistros.toLocaleString('pt-BR')} registros.
              </span>

              {linhasVisiveis < totalRegistros && (
                <button
                  type="button"
                  className="details-btn"
                  onClick={handleVerMais}
                >
                  Ver mais
                </button>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

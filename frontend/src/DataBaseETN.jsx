import React, { useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import './css/DataBaseETN.css';

import navioCru from './assets/navio/navio-cru.png';
import navioFrente from './assets/navio/navio-frente.png';
import navioMeio from './assets/navio/navio-meio.png';
import navioCauda from './assets/navio/navio-cauda.png';
import navioTorre from './assets/navio/navio-torre.png';
import navioBotes from './assets/navio/navio-botes.png';
import navioCargaSuperior from './assets/navio/navio-carga-superior.png';
import navioCargaInferior from './assets/navio/navio-carga-inferior.png';

Modal.setAppElement('#root');

const PLANILHAS_ETN = [
  {
    id: 'frente',
    nome: 'Manobras de Atracação',
    parte: 'frente',
    tituloParte: 'Frente',
    objetivo:
      'Registrar os processos operacionais ligados à proa do navio, incluindo aproximação, alinhamento e apoio de entrada em porto.',
    importancia:
      'Essa base organiza dados críticos de aproximação e controle da parte frontal da embarcação, apoiando leitura operacional, segurança de atracação e análise de comportamento em manobras portuárias.',
    requisitos: [
      'Mapeamento das manobras executadas na região frontal do navio.',
      'Registro dos cenários de aproximação e alinhamento.',
      'Classificação dos tipos de operação por contexto portuário.',
      'Consolidação de eventos relevantes para leitura analítica.',
      'Estruturação dos dados com foco em rastreabilidade operacional.',
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
    nome: 'Operação Central',
    parte: 'meio',
    tituloParte: 'Meio',
    objetivo:
      'Consolidar informações da área central da embarcação, com foco em fluxo operacional, equilíbrio de carga e suporte funcional.',
    importancia:
      'A área central representa a porção mais estratégica da estabilidade e da distribuição funcional do navio. Essa base permite avaliar ocupação, suporte interno e comportamento operacional em rota e em porto.',
    requisitos: [
      'Levantamento das operações concentradas na região central.',
      'Leitura do equilíbrio estrutural e funcional da embarcação.',
      'Identificação de pontos de apoio operacional recorrentes.',
      'Organização da movimentação interna associada ao trecho central.',
      'Padronização da base para análise comparativa.',
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
    nome: 'Propulsão e Saída',
    parte: 'cauda',
    tituloParte: 'Cauda',
    objetivo:
      'Monitorar a parte traseira do navio, incluindo saída, recuo, estabilidade posterior e resposta em deslocamento.',
    importancia:
      'A região traseira é fundamental para propulsão, controle de saída e estabilidade dinâmica da embarcação. Essa planilha auxilia o acompanhamento de desempenho e comportamento em manobras de retirada e navegação.',
    requisitos: [
      'Registro das operações ligadas à saída e deslocamento posterior.',
      'Monitoramento do comportamento da região traseira em manobras.',
      'Acompanhamento de estabilidade e resposta funcional.',
      'Organização de indicadores de propulsão e retirada.',
      'Leitura operacional da região traseira em cenários distintos.',
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
    nome: 'Comando e Navegação',
    parte: 'torre',
    tituloParte: 'Torre',
    objetivo:
      'Centralizar dados de comando, navegação e supervisão operacional da torre da embarcação.',
    importancia:
      'A torre concentra decisões de rota, leitura de ambiente e comando integrado. Essa base sustenta a visão gerencial e de controle superior do navio durante as etapas de navegação e manobra.',
    requisitos: [
      'Registro das rotinas de comando e monitoramento.',
      'Organização das leituras de navegação e ambiente.',
      'Consolidação de indicadores críticos para supervisão.',
      'Suporte à tomada de decisão em operação marítima.',
      'Padronização de eventos e controles da torre.',
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
    nome: 'Segurança e Apoio',
    parte: 'botes',
    tituloParte: 'Botes',
    objetivo:
      'Documentar os sistemas auxiliares de segurança da embarcação, incluindo botes, kits de apoio e readiness operacional.',
    importancia:
      'Esse conjunto reforça a camada de segurança e resposta da embarcação, sendo essencial para protocolos de contingência, inspeção e prontidão em operação.',
    requisitos: [
      'Inventário dos recursos auxiliares de segurança.',
      'Mapeamento dos itens de apoio distribuídos na embarcação.',
      'Registro de prontidão dos sistemas de resgate.',
      'Acompanhamento periódico de inspeção.',
      'Consolidação da base de readiness operacional.',
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
    nome: 'Carga Superior',
    parte: 'cargaSuperior',
    tituloParte: 'Carga Superior',
    objetivo:
      'Apresentar os volumes, posições e indicadores relacionados à área superior de carga da embarcação.',
    importancia:
      'A carga superior influencia distribuição, leitura logística e controle de operação em convés. Essa base permite acompanhar organização, ocupação e segurança do armazenamento superior.',
    requisitos: [
      'Mapeamento dos espaços de carga superior.',
      'Registro de ocupação e distribuição logística.',
      'Controle de estabilidade associado à carga elevada.',
      'Padronização dos dados de posicionamento.',
      'Leitura de segurança operacional da carga em convés.',
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
    nome: 'Carga Inferior',
    parte: 'cargaInferior',
    tituloParte: 'Carga Inferior',
    objetivo:
      'Concentrar informações operacionais e logísticas da área inferior de armazenamento do navio.',
    importancia:
      'A carga inferior é fundamental para estabilidade, capacidade e segurança da embarcação. Essa base organiza os registros centrais de ocupação, peso e controle do armazenamento inferior.',
    requisitos: [
      'Inventário dos compartimentos inferiores.',
      'Registro de ocupação, peso e categoria de carga.',
      'Monitoramento da estabilidade ligada à base do navio.',
      'Padronização da leitura logística dos porões.',
      'Estruturação de indicadores de controle da carga inferior.',
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

  const imagens = useMemo(
    () => ({
      base: {
        label: 'Navio completo',
        src: navioCru,
      },
      frente: {
        label: 'Frente',
        src: navioFrente,
      },
      meio: {
        label: 'Meio',
        src: navioMeio,
      },
      cauda: {
        label: 'Cauda',
        src: navioCauda,
      },
      torre: {
        label: 'Torre',
        src: navioTorre,
      },
      botes: {
        label: 'Botes',
        src: navioBotes,
      },
      cargaSuperior: {
        label: 'Carga Superior',
        src: navioCargaSuperior,
      },
      cargaInferior: {
        label: 'Carga Inferior',
        src: navioCargaInferior,
      },
    }),
    []
  );

  const imagemAtual = imagens[parteSelecionada] || imagens.base;
  const planilha = PLANILHAS_ETN[selecionada];
  const requisitos = planilha?.requisitos || [];
  const requisitoAtual = requisitos[reqPage] || '';

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
  };

  const handleSelecionarParte = (parte) => {
    const idx = PARTE_TO_INDEX_ETN[parte];
    if (idx !== undefined) {
      carregarPlanilha(idx);
    } else {
      setParteSelecionada('base');
    }
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

  useEffect(() => {
    carregarPlanilha(0);
  }, []);

  const headers = preview.length > 0 ? preview[0] : [];
  const bodyRows = preview.length > 1 ? preview.slice(1) : [];
  const detalheHeaders = detalhe.length > 0 ? detalhe[0] : [];
  const detalheRows = detalhe.length > 1 ? detalhe.slice(1) : [];

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
            base operacional fictícia do projeto ETN. Ao clicar em uma área
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

            {abas.length > 1 && (
              <div className="table-subtabs-wrap">
                <div className="table-subtabs-header">
                  <span className="table-subtabs-label">Abas da base</span>
                  <span className="table-subtabs-current">
                    {abaAtual ? `Selecionada: ${abaAtual}` : ''}
                  </span>
                </div>

                <div className="sheet-subtabs sheet-subtabs--table">
                  {abas.map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      className={`sheet-subtab ${abaAtual === aba ? 'active' : ''}`}
                      onClick={() => handleTrocarAba(aba)}
                    >
                      {aba}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="preview-wrapper">
              {carregando ? (
                <div className="empty-state">
                  <div className="loader" />
                  <p>Carregando prévia da base...</p>
                </div>
              ) : erro ? (
                <div className="empty-state error">
                  <p>{erro}</p>
                </div>
              ) : preview.length === 0 ? (
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
                      <tr key={rowIndex}>
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
                Exibindo uma amostra inicial da base selecionada
                {abaAtual ? ` • Aba: ${abaAtual}` : ''}.
              </span>

              <button
                type="button"
                className="details-btn"
                onClick={() => setModalAberto(true)}
                disabled={detalhe.length === 0}
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
              <h2>{planilha?.nome}</h2>
              <p className="modal-subtitle">{planilha?.objetivo}</p>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setModalAberto(false)}
            >
              ×
            </button>
          </div>

          {abas.length > 1 && (
            <div className="modal-abas">
              {abas.map((aba) => (
                <button
                  key={aba}
                  type="button"
                  className={`modal-aba-btn ${abaAtual === aba ? 'active' : ''}`}
                  onClick={() => handleTrocarAba(aba)}
                >
                  {aba}
                </button>
              ))}
            </div>
          )}

          <div className="modal-table-wrapper">
            {detalhe.length > 0 ? (
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
                  {detalheRows.map((row, rowIndex) => (
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
        </Modal>
      </div>
    </div>
  );
}
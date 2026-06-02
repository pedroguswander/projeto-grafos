import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from 'react-modal';
import './css/database.css';
import aviaoCru from './assets/Aviao/aviao cru.png';
import asasImg from './assets/Aviao/azas.png';
import caldaImg from './assets/Aviao/calda.png';
import frenteImg from './assets/Aviao/frente.png';
import meioImg from './assets/Aviao/meio.png';
import turbinasImg from './assets/Aviao/turbinas.png';
import conexoesFile from './assets/Planilhas1/Conexões.xlsx';
import egosFile from './assets/Planilhas1/Egos.xlsx';
import grausRankingsFile from './assets/Planilhas1/Graus & Rankings.xlsx';
import metricasFile from './assets/Planilhas1/Métricas.xlsx';
import rotasFile from './assets/Planilhas1/Rotas.xlsx';

Modal.setAppElement('#root');

const PLANILHAS = [
  {
    id: 'asas',
    nome: 'Conexões',
    arquivo: conexoesFile,
    parte: 'asas',
    tituloParte: 'Asas',
    objetivo:
      'Catalogar todos os aeroportos e suas respectivas regiões, além de mapear as conexões, seus pesos e seu tipo com a devida justificativa.',
    importancia:
      'Estrutura-base da malha aérea do projeto. Esta planilha sustenta a modelagem do grafo ao organizar as interconexões entre aeroportos, definir critérios de ligação e documentar pesos e justificativas que impactam diretamente as análises de conectividade, distância e coerência da rede.',
    requisitos: [
      'Definição dos nós do grafo com aeroportos identificados por código IATA.',
      'Construção das arestas em arquivo próprio com origem, destino, tipo de conexão, justificativa e peso.',
      'Presença de conexões intrarregionais para refletir a lógica operacional dentro de cada região.',
      'Presença de conexões entre diferentes regiões para manter integração nacional da malha.',
      'Garantia de grafo conectado, sem aeroportos isolados na estrutura principal.',
      'Modelagem não trivial, evitando excesso ou escassez injustificada de conexões.',
    ],
    img: asasImg,
    desc: 'Estrutura lateral responsável pela sustentação. Dataset de conexões entre aeroportos.',
  },
  {
    id: 'frente',
    nome: 'Egos',
    arquivo: egosFile,
    parte: 'frente',
    tituloParte: 'Frente',
    objetivo:
      'Registrar e calcular os egos de cada aeroporto, catalogando seus respectivos graus, ordem ego, tamanho ego e densidade ego.',
    importancia:
      'Camada analítica voltada à vizinhança imediata de cada aeroporto. Essa planilha mostra como cada terminal se comporta localmente dentro da rede, ajudando a revelar concentração de conexões, alcance estrutural e força relacional de cada ponto da malha.',
    requisitos: [
      'Cálculo da ego-network por aeroporto considerando o nó central e seus vizinhos diretos.',
      'Determinação do grau individual de cada aeroporto a partir das interconexões existentes.',
      'Cálculo da ordem da ego-subrede para medir o alcance local de cada terminal.',
      'Cálculo do tamanho da ego-subrede com base nas arestas presentes nesse recorte.',
      'Cálculo da densidade ego para avaliar coesão e intensidade de conexão local.',
      'Organização dos resultados em tabela completa por aeroporto.',
    ],
    img: frenteImg,
    desc: 'Seção frontal da aeronave. Dataset relacionado aos egos e centralidades.',
  },
  {
    id: 'meio',
    nome: 'Graus & Rankings',
    arquivo: grausRankingsFile,
    parte: 'meio',
    tituloParte: 'Meio',
    objetivo:
      'Demonstrar, de acordo com os graus de cada aeroporto, o aeroporto com o maior grau e menor grau, expondo também quais têm a maior densidade e qual o aeroporto mais conectado.',
    importancia:
      'Painel comparativo da malha aérea. Esta planilha transforma os resultados estruturais em leitura de destaque, permitindo identificar hubs, aeroportos menos integrados e posições de relevância dentro do grafo construído pelo grupo.',
    requisitos: [
      'Listagem do grau de cada aeroporto com base no número total de interconexões.',
      'Identificação do aeroporto mais conectado da rede por maior grau.',
      'Identificação do aeroporto menos conectado para leitura de baixa integração.',
      'Destaque dos aeroportos com maior densidade local a partir das ego-networks.',
      'Construção de rankings analíticos para comparação entre os principais nós da malha.',
    ],
    img: meioImg,
    desc: 'Parte central da fuselagem. Dataset com graus, influência e rankings.',
  },
  {
    id: 'turbinas',
    nome: 'Métricas',
    arquivo: metricasFile,
    parte: 'turbinas',
    tituloParte: 'Turbinas',
    objetivo:
      'Demonstrar de forma clara a ordem, tamanho e densidade do grafo completo, bem como estas mesmas informações delimitadas por regiões.',
    importancia:
      'Visão de desempenho estrutural da rede. Esta planilha consolida as métricas globais e regionais que descrevem a dimensão do grafo e o comportamento da conectividade aérea em diferentes recortes territoriais do Brasil.',
    requisitos: [
      'Cálculo da ordem do grafo completo com base no total de aeroportos.',
      'Cálculo do tamanho da rede considerando todas as arestas modeladas.',
      'Cálculo da densidade global do grafo não-direcionado.',
      'Geração das métricas por região em subgrafos induzidos.',
      'Comparação estrutural entre Norte, Nordeste, Sudeste, Sul e Centro-Oeste.',
      'Produção dos arquivos obrigatórios com métricas globais e regionais.',
    ],
    img: turbinasImg,
    desc: 'Sistema de propulsão da aeronave. Dataset com métricas analíticas da rede.',
  },
  {
    id: 'calda',
    nome: 'Rotas',
    arquivo: rotasFile,
    parte: 'calda',
    tituloParte: 'Calda',
    objetivo:
      'Listar as 5 principais rotas do grafo, bem como outras possíveis rotas para serem utilizadas.',
    importancia:
      'Componente que traduz a malha aérea em deslocamento. Essa planilha conecta os pesos definidos nas arestas ao cálculo de percursos, permitindo avaliar caminhos mínimos, rotas estratégicas e eficiência de ligação entre aeroportos da rede.',
    requisitos: [
      'Registro de pares origem-destino para análise de trajetos dentro do grafo.',
      'Cálculo de custo e percurso com Dijkstra usando os pesos definidos na modelagem.',
      'Atendimento às rotas obrigatórias Manaus → São Paulo e Recife → Porto Alegre.',
      'Estruturação da saída com custo total e caminho detalhado por rota.',
      'Base de apoio para construção da árvore de percurso e realce visual dos trajetos.',
      'Leitura analítica das rotas mais relevantes e alternativas da rede aérea.',
    ],
    img: caldaImg,
    desc: 'Parte traseira da aeronave. Dataset com rotas, trechos e ligações.',
  },
];

const PARTE_TO_INDEX = {
  asas: 0,
  frente: 1,
  meio: 2,
  turbinas: 3,
  calda: 4,
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

export default function DataBase({ onBack }) {
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
        label: 'Avião completo',
        src: aviaoCru,
      },
      frente: {
        label: 'Frente',
        src: frenteImg,
      },
      meio: {
        label: 'Meio',
        src: meioImg,
      },
      asas: {
        label: 'Asas',
        src: asasImg,
      },
      turbinas: {
        label: 'Turbinas',
        src: turbinasImg,
      },
      calda: {
        label: 'Calda',
        src: caldaImg,
      },
    }),
    []
  );

  const imagemAtual = imagens[parteSelecionada] || imagens.base;
  const planilha = PLANILHAS[selecionada];
  const requisitos = planilha?.requisitos || [];
  const requisitoAtual = requisitos[reqPage] || '';

  const carregarWorkbook = async (arquivo) => {
    const response = await fetch(arquivo, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Falha ao carregar arquivo (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (
      contentType.includes('text/html') ||
      contentType.includes('application/json')
    ) {
      throw new Error(
        `Resposta inválida para arquivo Excel. Content-Type: ${contentType}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return XLSX.read(arrayBuffer, {
      type: 'array',
    });
  };

  const normalizarLinhas = (rows = []) => {
    const maxCols = rows.reduce(
      (acc, row) => Math.max(acc, row?.length || 0),
      0
    );

    return rows.map((row) => {
      const novaLinha = [...row];
      while (novaLinha.length < maxCols) novaLinha.push('');
      return novaLinha;
    });
  };

  const extrairAba = (workbook, nomeAba) => {
    const sheet = workbook.Sheets[nomeAba];

    if (!sheet) {
      throw new Error(`A aba "${nomeAba}" não foi encontrada.`);
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    return normalizarLinhas(rows);
  };

  const carregarPlanilha = async (idx, abaDesejada = null) => {
    const item = PLANILHAS[idx];
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
      const workbook = await carregarWorkbook(item.arquivo);
      const nomesAbas = workbook.SheetNames || [];

      if (!nomesAbas.length) {
        throw new Error(`A planilha "${item.nome}" não possui abas.`);
      }

      const abaSelecionada =
        abaDesejada && nomesAbas.includes(abaDesejada)
          ? abaDesejada
          : nomesAbas[0];

      const rows = extrairAba(workbook, abaSelecionada);

      if (!rows.length) {
        throw new Error(
          `A aba "${abaSelecionada}" da planilha "${item.nome}" está vazia.`
        );
      }

      setAbas(nomesAbas);
      setAbaAtual(abaSelecionada);
      setPreview(rows.slice(0, 6));
      setDetalhe(rows);
    } catch (e) {
      console.error('Erro ao carregar planilha:', e);
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
    const idx = PARTE_TO_INDEX[parte];
    if (idx !== undefined) {
      carregarPlanilha(idx);
    } else {
      setParteSelecionada('base');
    }
  };

  const handleTrocarAba = (nomeAba) => {
    carregarPlanilha(selecionada, nomeAba);
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
    <div className="database-page">
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
          <h1 className="database-title">Estrutura do Projeto</h1>
          <p className="database-desc">
            Navegue visualmente pela aeronave e associe cada componente a uma
            planilha do projeto. Ao clicar em uma área específica, a prévia dos
            dados é atualizada automaticamente.
          </p>
        </header>

        <div className="database-grid">
          <section className="database-card plane-card">
            <div className="card-head">
              <div>
                <p className="eyebrow">Navegação Interativa</p>
              </div>
            </div>

            <div className="plane-stage">
              <div className="plane-image-wrap">
                <img
                  src={imagemAtual.src}
                  alt={imagemAtual.label}
                  className="database-image"
                />

                <button
                  type="button"
                  className="plane-hotspot hotspot-frente"
                  onClick={() => handleSelecionarParte('frente')}
                  aria-label="Selecionar frente"
                  title="Frente"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-1"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-2"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-meio-3"
                  onClick={() => handleSelecionarParte('meio')}
                  aria-label="Selecionar meio"
                  title="Meio"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-1"
                  onClick={() => handleSelecionarParte('asas')}
                  aria-label="Selecionar asas"
                  title="Asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-2"
                  onClick={() => handleSelecionarParte('asas')}
                  aria-label="Selecionar asas"
                  title="Asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-3"
                  onClick={() => handleSelecionarParte('asas')}
                  aria-label="Selecionar asas"
                  title="Asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-asa-4"
                  onClick={() => handleSelecionarParte('asas')}
                  aria-label="Selecionar asas"
                  title="Asas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-turbina-1"
                  onClick={() => handleSelecionarParte('turbinas')}
                  aria-label="Selecionar turbinas"
                  title="Turbinas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-turbina-2"
                  onClick={() => handleSelecionarParte('turbinas')}
                  aria-label="Selecionar turbinas"
                  title="Turbinas"
                />
                <button
                  type="button"
                  className="plane-hotspot hotspot-calda"
                  onClick={() => handleSelecionarParte('calda')}
                  aria-label="Selecionar calda"
                  title="Calda"
                />
              </div>
            </div>
          </section>

          <section className="database-card top-info-card">
            <div className="card-head">
              <div>
                <h2>Informações da Planilha</h2>
              </div>
            </div>

            <div className="sheet-tabs">
              {PLANILHAS.map((item, idx) => (
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
              <h2
                className="table-preview-title"
                style={{
                  margin: '4px 0 20px 0',
                  fontSize: '1.5rem',
                  color: '#f4f8ff',
                  fontWeight: '900',
                }}
              >
                Prévia da Planilha
              </h2>
            </div>

            {abas.length > 1 && (
              <div className="table-subtabs-wrap">
                <div className="table-subtabs-header">
                  <span className="table-subtabs-label">Abas da planilha</span>
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
                  <p>Carregando prévia da planilha...</p>
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
                Exibindo uma amostra inicial da planilha selecionada
                {abaAtual ? ` • Aba: ${abaAtual}` : ''}.
              </span>

              <button
                type="button"
                className="details-btn"
                onClick={() => setModalAberto(true)}
                disabled={detalhe.length === 0}
              >
                Ver planilha completa
              </button>
            </div>
          </section>
        </div>

        <Modal
          isOpen={modalAberto}
          onRequestClose={() => setModalAberto(false)}
          className="database-modal"
          overlayClassName="database-modal-overlay"
          contentLabel="Detalhes da planilha"
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
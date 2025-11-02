
import { GoogleGenAI, Type } from "@google/genai";
import { type AnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    facts: {
      type: Type.STRING,
      description: "Resumo dos fatos principais: valor da causa, partes (reclamante e reclamado), e tribunal."
    },
    gaps: {
      type: Type.ARRAY,
      description: "Uma lista de 2 a 3 lacunas ou violações processuais na execução.",
      items: { type: Type.STRING }
    },
    nextPleading: {
      type: Type.STRING,
      description: "O texto completo da petição de execução, pronta para ser protocolada, formatada com quebras de linha."
    },
    assets: {
      type: Type.ARRAY,
      description: "Uma lista de bens sugeridos para penhora (contas bancárias, veículos, imóveis).",
      items: { type: Type.STRING }
    },
    processNumber: {
        type: Type.STRING,
        description: "O número do processo judicial identificado no documento. Formato: NNNNNNN-DD.AAAA.J.TR.OOOO. Se não encontrar, retorne 'N/A'."
    }
  },
  required: ['facts', 'gaps', 'nextPleading', 'assets', 'processNumber']
};

export async function analyzeDocument(text: string, includeInjunction: boolean): Promise<AnalysisResult> {
    const systemInstruction = "Você é um advogado trabalhista brasileiro, altamente especializado em fase de execução, com profundo conhecimento do artigo 477 da CLT e das práticas de execução forçada. Sua tarefa é analisar sentenças trabalhistas e fornecer um relatório estruturado para auxiliar outros advogados.";

    const userPrompt = `
      Analise o texto da sentença trabalhista a seguir.

      Texto do Documento:
      ---
      ${text}
      ---

      Siga estas instruções rigorosamente:
      1.  **Identifique os Fatos:** Extraia o valor exato da condenação, o nome completo das partes (reclamante e reclamado), e o tribunal de origem. Sintetize em um parágrafo conciso.
      2.  **Detecte Lacunas na Execução:** Identifique 2 ou 3 possíveis problemas ou omissões que podem dificultar a execução. Exemplos: falta de provas de bens, prescrição intercorrente, citação inválida, ausência de cálculos atualizados. Liste-os como itens separados.
      3.  **Elabore a Petição de Execução:** Redija uma petição inicial de execução completa e pronta para protocolo, em português do Brasil. A petição deve ter um cabeçalho, a fundamentação jurídica baseada nos fatos e na CLT (art. 477, 789, 879), e um pedido claro para o início da execução forçada, incluindo a multa de 40% se aplicável. ${includeInjunction ? 'IMPORTANTE: Inclua um pedido de tutela de urgência antecipada para arresto de bens, justificando o periculum in mora e fumus boni iuris com base nas lacunas encontradas.' : ''}
      4.  **Liste Bens para Penhora:** Sugira uma lista de tipos de ativos que podem ser penhorados, como 'Contas bancárias via SISBAJUD', 'Veículos via RENAJUD', 'Imóveis via CNIB'.
      5.  **Extraia o Número do Processo:** Encontre e retorne o número do processo no formato padrão. Se não encontrar, retorne 'N/A'.

      Retorne sua análise estritamente no formato JSON especificado.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.2,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);

        // Ensure all fields are present to match the AnalysisResult type
        return {
            facts: parsedResult.facts || "Não foi possível extrair os fatos.",
            gaps: Array.isArray(parsedResult.gaps) ? parsedResult.gaps : ["Não foi possível identificar gaps."],
            nextPleading: parsedResult.nextPleading || "Não foi possível gerar a petição.",
            assets: Array.isArray(parsedResult.assets) ? parsedResult.assets : ["Não foi possível sugerir bens."],
            processNumber: parsedResult.processNumber || "N/A",
        };
    } catch (error) {
        console.error("Gemini API error:", error);
        throw new Error("A IA não conseguiu processar o documento. Tente novamente ou verifique o conteúdo do PDF.");
    }
}

export async function suggestAdditionalAssets(facts: string): Promise<string[]> {
    const systemInstruction = "Você é um assistente de pesquisa para advogados, especializado em encontrar ativos de devedores. Use informações públicas simuladas para sugerir bens.";

    const userPrompt = `
        Com base nos fatos do processo a seguir, sugira bens adicionais para penhora. Finja pesquisar em fontes públicas como ERPs e Renajud.

        Fatos: ${facts}

        Sugira 2-3 ativos específicos adicionais (ex: 'Imóvel registrado na matrícula X do 1º CRI de São Paulo', 'Veículo Fiat Argo placa XYZ-1234').
        Retorne apenas uma lista de strings em formato JSON. Exemplo: ["Ativo 1", "Ativo 2"].
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                temperature: 0.8,
            }
        });

        const jsonText = response.text.trim();
        const assets = JSON.parse(jsonText);
        return Array.isArray(assets) ? assets : [];

    } catch (error) {
        console.error("Gemini API error (suggest assets):", error);
        throw new Error("Não foi possível sugerir bens adicionais no momento.");
    }
}
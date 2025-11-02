
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProgressBar } from './components/ProgressBar';
import { ResultCard } from './components/ResultCard';
import { FactsIcon, GapsIcon, PleadingIcon, AssetsIcon, SparklesIcon, AlertIcon } from './components/IconComponents';
import { extractTextFromPdf } from './services/pdfParser';
import { analyzeDocument, suggestAdditionalAssets } from './services/geminiService';
import { exportToDocx } from './services/docGenerator';
import { type AnalysisResult } from './types';

const App: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ value: number, message: string }>({ value: 0, message: '' });
    const [error, setError] = useState<string | null>(null);

    // Bonus features state
    const [includeInjunction, setIncludeInjunction] = useState<boolean>(false);
    const [isSuggestingAssets, setIsSuggestingAssets] = useState<boolean>(false);

    const resetState = useCallback(() => {
        setPdfFile(null);
        setAnalysisResult(null);
        setIsLoading(false);
        setProgress({ value: 0, message: '' });
        setError(null);
        setIncludeInjunction(false);
        setIsSuggestingAssets(false);
    }, []);

    const handleFileSelect = (file: File) => {
        resetState();
        setPdfFile(file);
    };

    const handleAnalyzeClick = async () => {
        if (!pdfFile) {
            setError('Por favor, selecione um arquivo PDF primeiro.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            setProgress({ value: 25, message: 'Extraindo texto do PDF...' });
            const extractedText = await extractTextFromPdf(pdfFile);
            if (!extractedText || extractedText.trim().length < 100) {
                throw new Error("Não foi possível extrair texto suficiente do PDF. O arquivo pode estar vazio, ser uma imagem ou estar corrompido.");
            }

            setProgress({ value: 50, message: 'Analisando o documento com IA... Isso pode levar um momento.' });
            const result = await analyzeDocument(extractedText, includeInjunction);
            
            setProgress({ value: 100, message: 'Análise concluída!' });
            setAnalysisResult(result);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido durante a análise.');
        } finally {
            setIsLoading(false);
            setProgress({ value: 0, message: '' });
        }
    };

    const handleExportClick = () => {
        if (!analysisResult) return;
        exportToDocx(analysisResult);
    };

    const handleSuggestAssetsClick = async () => {
        if (!analysisResult || !analysisResult.facts) return;
        setIsSuggestingAssets(true);
        try {
            const additionalAssets = await suggestAdditionalAssets(analysisResult.facts);
            setAnalysisResult(prev => {
                if (!prev) return null;
                const newAssets = [...prev.assets, ...additionalAssets.filter(asset => !prev.assets.includes(asset))];
                return { ...prev, assets: newAssets };
            });
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Não foi possível sugerir bens adicionais.');
        } finally {
            setIsSuggestingAssets(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <header className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#0D47A1]">Analisador de Sentença Trabalhista</h1>
                    <p className="mt-2 text-gray-600">Potencializado por IA para extrair insights e acelerar a execução.</p>
                </header>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
                    
                    {pdfFile && (
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg">
                             <div className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    id="injunction-toggle"
                                    type="checkbox"
                                    checked={includeInjunction}
                                    onChange={(e) => setIncludeInjunction(e.target.checked)}
                                    disabled={isLoading}
                                    className="h-4 w-4 rounded border-gray-300 text-[#0D47A1] focus:ring-[#0D47A1]"
                                />
                                <label htmlFor="injunction-toggle">Incluir pedido de tutela antecipada</label>
                            </div>
                            <button
                                onClick={handleAnalyzeClick}
                                disabled={isLoading}
                                className="w-full sm:w-auto bg-[#0D47A1] text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-[#0b3a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Analisando...' : 'Analisar'}
                                {!isLoading && <SparklesIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    )}
                </div>

                {isLoading && <ProgressBar value={progress.value} message={progress.message} />}

                {error && (
                    <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-start gap-3" role="alert">
                        <AlertIcon className="w-5 h-5 mt-0.5"/>
                        <div>
                            <strong className="font-bold">Erro!</strong>
                            <span className="block sm:inline ml-1">{error}</span>
                        </div>
                    </div>
                )}

                {analysisResult && (
                    <div className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResultCard title="Fatos Relevantes" icon={<FactsIcon />}>
                                <p className="text-sm whitespace-pre-wrap">{analysisResult.facts}</p>
                            </ResultCard>
                             <ResultCard title="Pontos de Atenção (Gaps)" icon={<GapsIcon />}>
                                <ul className="list-disc list-inside space-y-2 text-sm">
                                    {analysisResult.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                                </ul>
                            </ResultCard>
                        </div>

                        <div className="mt-6">
                           <ResultCard title="Minuta da Petição de Execução" icon={<PleadingIcon />}>
                                <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto border">{analysisResult.nextPleading}</div>
                            </ResultCard>
                        </div>
                        
                        <div className="mt-6">
                            <ResultCard title="Bens Sugeridos para Penhora" icon={<AssetsIcon />}>
                                 <ul className="list-disc list-inside space-y-2 text-sm">
                                    {analysisResult.assets.map((asset, i) => <li key={i}>{asset}</li>)}
                                </ul>
                                <button
                                    onClick={handleSuggestAssetsClick}
                                    disabled={isSuggestingAssets}
                                    className="mt-4 w-full text-sm bg-blue-100 text-[#0D47A1] font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSuggestingAssets ? 'Buscando...' : 'Sugerir bens adicionais'}
                                    {!isSuggestingAssets && <SparklesIcon className="w-4 h-4" />}
                                </button>
                            </ResultCard>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleExportClick}
                                className="flex-1 bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200"
                            >
                                Exportar para Word (.docx)
                            </button>
                             <button
                                onClick={resetState}
                                className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-200"
                            >
                                Apagar Agora e Começar de Novo
                            </button>
                        </div>
                    </div>
                )}
                 <footer className="mt-12 text-center text-xs text-gray-500">
                    <p>Este documento foi gerado por IA – o conteúdo é preliminar e deve ser revisado pelo advogado antes do protocolo. O SaaS não constitui consultoria jurídica.</p>
                    <p className="mt-1">Nenhum dado é armazenado permanentemente. Sua sessão é privada e os dados são apagados ao final do uso.</p>
                </footer>
            </main>
        </div>
    );
};

export default App;

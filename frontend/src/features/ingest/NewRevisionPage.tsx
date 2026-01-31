import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import * as pdfjs from 'pdfjs-dist';
import { X, Plus, FileText, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentItem {
    id: string;
    url: string;
    type: 'image' | 'pdf_page';
    name: string;
}

const convertPdfToImages = async (file: File): Promise<DocumentItem[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const items: DocumentItem[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2d context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
        }).promise;

        items.push({
            id: `${file.name}-p${i}-${Date.now()}`,
            url: canvas.toDataURL('image/jpeg', 0.8),
            type: 'pdf_page',
            name: `${file.name} (Page ${i})`
        });
    }
    return items;
};

export const NewRevisionPage = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFiles = async (files: FileList) => {
        setIsProcessing(true);
        const newDocs: DocumentItem[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type === 'application/pdf') {
                    const pdfPages = await convertPdfToImages(file);
                    newDocs.push(...pdfPages);
                } else if (file.type.startsWith('image/')) {
                    const url = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    newDocs.push({
                        id: `${file.name}-${Date.now()}`,
                        url,
                        type: 'image',
                        name: file.name
                    });
                }
            }
            setDocuments(prev => [...prev, ...newDocs]);
        } catch (error) {
            console.error('Error processing files:', error);
            alert('Erreur lors du traitement de certains fichiers.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files);
    };

    const removeDocument = (id: string) => {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
    };

    const handleAnalyze = () => {
        if (documents.length === 0) return;

        // Store all images for analysis
        const imagesBase64 = documents.map(doc => doc.url);
        sessionStorage.setItem('pendingDocuments', JSON.stringify(imagesBase64));
        navigate('/analyze');
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-5xl mx-auto">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(-1)}
                    className="mb-8 flex items-center gap-3 px-4 py-2 bg-white border-2 border-slate-100 text-slate-500 font-bold rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Retour</span>
                </motion.button>


                <header className="mb-12 text-center">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Nouveau Cours
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">
                        Ajoutez vos documents (PDF ou Photos) pour créer vos fiches de révision.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upload Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 sticky top-8">
                            <label className="block w-full cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="border-4 border-dashed border-slate-100 rounded-3xl p-8 text-center hover:border-indigo-400 hover:bg-slate-50 transition-all group">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Plus className="w-8 h-8" />
                                    </div>
                                    <p className="font-black text-slate-900">Ajouter des fichiers</p>
                                    <p className="text-xs text-slate-400 mt-2">PDF ou Photos (JPG, PNG)</p>
                                </div>
                            </label>

                            <div className="mt-8 pt-8 border-t border-slate-50">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={documents.length === 0 || isProcessing}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>Lancer l'analyse ({documents.length})</>
                                    )}
                                </button>
                                {documents.length > 0 && (
                                    <button
                                        onClick={() => setDocuments([])}
                                        className="w-full mt-4 py-2 text-slate-400 hover:text-red-500 font-bold transition-colors"
                                    >
                                        Tout effacer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Gallery Section */}
                    <div className="lg:col-span-2">
                        {documents.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-20 text-slate-300">
                                <FileText className="w-20 h-20 mb-4 opacity-20" />
                                <p className="text-xl font-bold">Aucun document ajouté</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="group relative aspect-[3/4] bg-white rounded-3xl shadow-md overflow-hidden border border-slate-100 hover:shadow-xl transition-all"
                                    >
                                        <img
                                            src={doc.url}
                                            alt={doc.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                                            <button
                                                onClick={() => removeDocument(doc.id)}
                                                className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <div className="text-white text-center">
                                                {doc.type === 'pdf_page' ? (
                                                    <FileText className="w-8 h-8 mx-auto mb-2" />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                                )}
                                                <p className="text-[10px] font-bold line-clamp-2 px-2 leading-tight">
                                                    {doc.name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

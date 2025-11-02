
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './IconComponents';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback((file: File | null) => {
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
      setFileName(file.name);
    } else {
      // Basic error handling for non-PDF files
      alert("Por favor, selecione um arquivo no formato PDF.");
    }
  }, [onFileSelect]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ease-in-out ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isDragging ? 'border-[#0D47A1] bg-blue-50' : 'border-gray-300 hover:border-[#0D47A1]'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center text-gray-500">
        <UploadIcon className={`w-12 h-12 mb-4 ${isDragging ? 'text-[#0D47A1]' : 'text-gray-400'}`} />
        <p className="font-semibold text-gray-700">Arraste a sentença trabalhista (PDF)</p>
        <p className="text-sm">ou <span className="text-[#0D47A1] font-semibold">clique para selecionar</span></p>
        {fileName && !disabled && (
          <p className="mt-4 text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
            Arquivo selecionado: {fileName}
          </p>
        )}
      </div>
    </div>
  );
};

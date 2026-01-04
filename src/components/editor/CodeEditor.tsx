"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import { Code2, Loader2 } from "lucide-react";

export function CodeEditor() {
  const { selectedFile, getFileContent, updateFile } = useFileSystem();
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsLoading(false);
    setLoadError(false);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      updateFile(selectedFile, value);
    }
  };

  const handleEditorLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  const handleEditorError = (error: any) => {
    console.warn('Monaco Editor initialization error:', error);
    setLoadError(true);
    setIsLoading(false);
  };

  // Reset loading state when selectedFile changes
  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
  }, [selectedFile]);

  const getLanguageFromPath = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Code2 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Select a file to edit
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Choose a file from the file tree
          </p>
        </div>
      </div>
    );
  }

  const content = getFileContent(selectedFile) || '';
  const language = getLanguageFromPath(selectedFile);

  return (
    <div className="h-full relative">
      {(isLoading || loadError) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
          {loadError ? (
            <div className="text-center">
              <Code2 className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-400">Editor loading failed</p>
              <p className="text-xs text-gray-600 mt-1">Try switching tabs or refreshing</p>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-gray-400">Loading editor...</p>
            </div>
          )}
        </div>
      )}
      <Editor
        height="100%"
        language={language}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={<div />} // Disable default loading UI
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          // Add performance optimizations
          suggest: {
            showKeywords: false,
            showSnippets: false,
          },
          quickSuggestions: false,
          parameterHints: { enabled: false },
          hover: { enabled: false },
        }}
      />
    </div>
  );
}